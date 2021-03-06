const Sequelize = require('sequelize');
const {faculty} = require('../../common/utils/connect.js');

const Title = faculty.define('title', {
    titleId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    profileId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
    },
    from: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
    },
    to: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
    },
});

module.exports = Title;
