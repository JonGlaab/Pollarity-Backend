const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Response = sequelize.define('Response', {
    response_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    response_text: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'responses',
    timestamps: false
});

module.exports = Response;