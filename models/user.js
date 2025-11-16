const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    hooks:{
        beforeCreate : async (User) => {
            if (User.password){
                const salt = await bcrypt.genSalt(8);
                User.password = await bcrypt.hash(User.password, salt);
            }
        }
    },
    user_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    user_photo_url:{
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue:"https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_960_720.png"
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        isEmail: true
    },
    age:{
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min:16
        }
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
        type: DataTypes.ENUM('admin','user'),
        defaultValue:'user',
        allowNull: false,
    }
},{
    tableName: 'users',
    timestamps: false,
});
module.exports = User;