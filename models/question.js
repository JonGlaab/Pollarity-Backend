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
    },
        survey_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'surveys',
            key: 'survey_id'
        },
    },
}, {
    tableName: 'questions',
    timestamps: false,
    indexes: [
        {
            name: 'survey_id_question_order_idx',
            fields: ['survey_id', 'question_order']
        }
    ]
});

module.exports = Question;