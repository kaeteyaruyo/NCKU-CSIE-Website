const Sequelize = require('sequelize');
const {faculty} = require('../../common/utils/connect.js');
const LanguageUtils = require('../../common/utils/language.js');

const ExperienceI18n = faculty.define('experienceI18n', {
    experienceId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
    },
    languageId: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        defaultValue: LanguageUtils.defaultLanguageId,
    },
    organization: {
        type: Sequelize.STRING(100),
        allowNull: false,
    },
    department: {
        type: Sequelize.STRING(100),
        allowNull: true,
    },
    title: {
        type: Sequelize.STRING(100),
        allowNull: true,
    },
});

module.exports = ExperienceI18n;
