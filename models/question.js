const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Question = sequelize.define('Question', {
    question_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },

    question_text: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    question_type: {
        type: DataTypes.ENUM('multiple_choice', 'checkbox', 'short_answer', 'page_break'),
        allowNull: false
    },
    question_order: {
        type: DataTypes.INTEGER,
        validate:{
            min:1
        },
    },
    is_required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'questions',
    timestamps: false
});

module.exports = Question;