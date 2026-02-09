const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    create: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    edit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    delete: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'Permissions',
});

module.exports = Permission;