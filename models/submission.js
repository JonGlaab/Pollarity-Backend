const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Submission = sequelize.define('Submission', {
    submission_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    submitted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'submissions',
    timestamps: false
});

module.exports = Submission;