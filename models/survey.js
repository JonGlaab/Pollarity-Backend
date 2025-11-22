const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");


const Survey = sequelize.define("Survey", {
    survey_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nice_url:{
        type: DataTypes.STRING(32),
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    status:{
        type: DataTypes.ENUM('draft','published','closed'),
        defaultValue: "draft"
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    has_answers:{
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    }
},{
    tableName: "surveys",
    timestamps: false,
});
module.exports = Survey;