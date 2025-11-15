const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    user_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    firstname: {
        type: DataTypes.STRING(100)
    },
    lastname: {
        type: DataTypes.STRING(100)
    },
    user_photo_url:{
        type: DataTypes.STRING(255)
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        isEmail: true
    },
    dob:{
        type: DataTypes.DATE,
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        minLength: 8,
        maxLength: 20,

    },
    isBanned:{
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    role_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
    }
},{
    tableName: 'users',
    timestamps: false,
});
module.exports = User;