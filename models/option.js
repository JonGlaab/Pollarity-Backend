const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Option = sequelize.define('Option', {
    option_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    option_text: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    option_order: {
        type: DataTypes.INTEGER,
        validate:{
            min:1
        }
    }
}, {
    tableName: 'options',
    timestamps: false
});

module.exports = Option;