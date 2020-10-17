const Sequelize = require('sequelize');
const {
    Announcement,
    AnnouncementI18n,
    Tag,
} = require('./associations.js');
const LanguageUtils = require('../../common/utils/language.js');
const ValidateUtils = require('../../common/utils/validate.js');
const tagUtils = require('../utils/tag.js');

/**
 * A function for getting all announcements.
 *
 * @async
 * @param {string[]} [tags = []]                            - Specifying the announcements with the given tags.
 * @param {string}   [startTime = defaultValue.startTime]   - A string of the js Date object, specifying the earliest time of filter interval when
 *                                                            announcements were post.
 * @param {string}   [endTime = defaultValue.endTime]       - A string of the js Date object, specifying the latest time of filter interval when
 *                                                            announcements were post.
 * @param {number}   [page = defaultValue.page]             - Specify the announcements under the given page number.
 * @param {number}   [language = defaultValue.language] - Language option of the announcements.
 * @returns {object[]}                                      Requested announcements, including:
 * - id
 * - title
 * - content
 * - updateTime
 * - tags(id, name)
 *
 * Announcements which contain all the given tags are taken into account.
 */

const op = Sequelize.Op;

module.exports = async (opt) => {
    try {
        const {
            tags = [],
            page = null,
            amount = null,
            from = null,
            to = null,
            language = null,
        } = opt || {};

        if (!tags.every(tagUtils.isSupportedId, tagUtils)) {
            const error = new Error('invalid tag id');
            error.status = 400;
            throw error;
        }
        if (!ValidateUtils.isPositiveInteger(page)) {
            const error = new Error('invalid page');
            error.status = 400;
            throw error;
        }
        if (!ValidateUtils.isPositiveInteger(amount)) {
            const error = new Error('invalid amount');
            error.status = 400;
            throw error;
        }
        if (!ValidateUtils.isValidDate(from)) {
            const error = new Error('invalid time - from');
            error.status = 400;
            throw error;
        }
        if (!ValidateUtils.isValidDate(to)) {
            const error = new Error('invalid time - to');
            error.status = 400;
            throw error;
        }
        if (!LanguageUtils.isSupportedLanguageId(language)) {
            const error = new Error('invalid language id');
            error.status = 400;
            throw error;
        }

        let data = await Announcement.findAll({
            attributes: ['announcementId'],
            where: {
                updateTime: {
                    [op.between]: [
                        from,
                        to,
                    ],
                },
                isPublished: true,
            },
            include: [
                {
                    model: Tag,
                    as: 'tags',
                    attributes: [],
                    where: {
                        tagId: {
                            [op.in]: tags,
                        },
                    },
                },
            ],
            group: '`announcement`.`announcementId`',
            having: Sequelize.where(Sequelize.fn('count', Sequelize.col('`announcement`.`announcementId`')), tags.length),
            order: [
                [
                    'updateTime',
                    'DESC',
                ],
            ],
            offset: amount * (page - 1),
            limit: amount,

            /**
             * Sequelize have some issue when using limit, currently solving hack can use `subQuery: fasle`.
             */

            subQuery: false,
        });

        if (!data.length) {
            const error = new Error('no result');
            error.status = 404;
            throw error;
        }

        data = await Promise.all(data.map(({announcementId}) => Announcement.findOne({
            attributes: [
                'announcementId',
                'updateTime',
            ],
            where: {
                announcementId,
            },
            include: [
                {
                    model: AnnouncementI18n,
                    as: 'announcementI18n',
                    attributes: [
                        'title',
                        'content',
                    ],
                    where: {
                        language,
                    },
                },
                {
                    model: Tag,
                    as: 'tags',
                    attributes: ['tagId'],
                },
            ],
            order: [
                [
                    'updateTime',
                    'DESC',
                ],
            ],
        })));

        return data.map(announcement => ({
            announcementId: announcement.announcementId,
            updateTime: announcement.updateTime,
            title: announcement.announcementI18n[0].title,
            content: announcement.announcementI18n[0].content,
            tags: announcement.tags.map(tag => tag.tagId),
        }));
    }
    catch (err) {
        if (err.status)
            throw err;
        const error = new Error();
        error.status = 500;
        throw error;
    }
};
