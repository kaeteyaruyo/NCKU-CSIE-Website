/**
 * Router module for route `/announcement`.
 *
 * Including following sub-routes:
 * - `/announcement/`
 * - `/announcement/activity`
 * - `/announcement/all`
 * - `/announcement/recruitment`
 * - `/announcement/[id]`
 * - `/announcement/staff`
 */

const express = require('express');
const MarkdownIt = require('markdown-it');

const staticHtml = require('./utils/static-html.js');
const tagUtils = require('../models/announcement/utils/tag.js');

const getAnnouncement = require('../models/announcement/operations/get-announcement.js');
const getFile = require('../models/announcement/operations/get-file.js');

const router = express.Router({
    caseSensitive: true,
    mergeParams: false,
    strict: false,
});

/**
 * Resolve URL `/announcement`.
 */

router
.route([
    '/',
    '/index',
])
.get(staticHtml('announcement/index'));

/**
 * Resolve URL `/announcement/activity`.
 */

router
.route('/activity')
.get(staticHtml('announcement/activity'));

/**
 * Resolve URL `/announcement/admission`.
 */

router
.route('/admission')
.get(staticHtml('announcement/admission'));

/**
 * Resolve URL `/announcement/all`.
 */

router
.route('/all')
.get(async ({}, res, next) => {
    try {
        res.locals.UTILS.announcement = {
            tagUtils,
        };

        await new Promise((resolve, reject) => {
            res.render('announcement/all.pug', (err, html) => {
                if (err) {
                    reject(err);
                    return;
                }
                res.send(html);
                resolve();
            });
        });
    }
    catch (error) {
        next(error);
    }
});

/**
 * Resolve URL `/announcement/recruitment`.
 */

router
.route('/recruitment')
.get(staticHtml('announcement/recruitment'));

/**
 * Resolve URL `/announcement/[id]`.
 */

router
.route('/:announcementId')
.get(async (req, res, next) => {
    try {
        const data = await getAnnouncement({
            announcementId: Number(req.params.announcementId),
            languageId: req.query.languageId,
        });

        res.locals.UTILS.announcement = {
            tagUtils,
        };
        res.locals.UTILS.md = new MarkdownIt({
            breaks: true,
            linkify: true,
        });

        await new Promise((resolve, reject) => {
            res.render('announcement/detail.pug', {
                data,
            }, (err, html) => {
                if (err) {
                    reject(err);
                    return;
                }
                res.send(html);
                resolve();
            });
        });
    }
    catch (error) {
        if (error.status === 404)
            next();
        else
            next(error);
    }
});

/**
 * Resolve URL `/announcement/[id]/file/[fileId]`.
 */

router
.route('/:announcementId/file/:fileId')
.get(async (req, res, next) => {
    try {
        const file = await getFile(Number(req.params.fileId));
        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', `attachment;filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.send(Buffer.from(file.content, 'binary'));
    }
    catch (error) {
        if (error.status === 404)
            next();
        else
            next(error);
    }
});

module.exports = router;
