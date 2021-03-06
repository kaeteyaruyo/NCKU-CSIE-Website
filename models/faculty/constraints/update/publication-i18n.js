const LanguageUtils = require('../../../common/utils/language.js');

const PublicationI18nValidationConstraints = {
    languageId: {
        presence: true,
        type: {
            type: LanguageUtils.isSupportedLanguageId,
        },
    },
    title: {
        presence: false,
        type: 'string',
        length: {
            maximum: 500,
        },
    },
    authors: {
        presence: false,
        type: 'string',
        length: {
            maximum: 500,
        },
    },
};

module.exports = PublicationI18nValidationConstraints;
