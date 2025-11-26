require("dotenv").config();
const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');
const { sendWelcomeEmail } = require('../services/emailService');

const User = sequelize.define('User', {

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
        defaultValue:"https://pollarity-profile-photos.s3.ca-east-006.backblazeb2.com/default-profile.png"
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        isEmail: true
    },
    google_id:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            len: [8, 20],
        }
    },
    passwordConfirmation: {
      type: DataTypes.VIRTUAL,
      set : function (value) {
          this.setDataValue('password', value);

      },
      validate :{
          isEmail : function (value) {
              if (this.password !== value) {
                  throw new Error('Password confirmation does not match password.');
              }
          }
      }
    },
    isBanned:{
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    role:{
        type: DataTypes.ENUM('admin','user'),
        defaultValue:'user',
        allowNull: false,
    }
}, {
    tableName: 'users',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['email'],
            name: 'unique_email'
        },
        {
            unique: true,
            fields: ['google_id'],
            name: 'unique_google_id'
        }
    ],
    hooks: {
        beforeValidate: (user) => {

            if (!user.google_id && !user.password) {
                throw new Error('Password is required for local accounts.');
            }
        },
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
       afterCreate: (user) => {
            try {
                sendWelcomeEmail(user.email, user.first_name)
                    .then(result => {
                        if (!result) {
                            console.error("⚠️ Welcome email failed for:", user.email);
                        }
                    })
                    .catch(err => {
                        console.error("🔥 Critical welcome email failure:", err);
                    });

            } catch (err) {
                console.error("🔥 afterCreate hook error:", err);
            }
        }
    }
});

User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;