const Sequelize = require('sequelize');
const {faculty} = require('../../common/utils/connect.js');

const TechnologyTransferPatent = faculty.define('technologyTransferPatent', {
    technologyTransferId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
    },
    technologyTransferPatentId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
});

module.exports = TechnologyTransferPatent;
