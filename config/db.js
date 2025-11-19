const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Configure SSL for Aiven MySQL
let sslConfig = {};

if (process.env.DB_SSL === 'true' || process.env.DB_SSL === 'required') {
    const caCertPath = path.join(__dirname, '..', 'certs', 'ca.pem');
    
    // Check if CA certificate file exists
    if (fs.existsSync(caCertPath)) {
        const caCert = fs.readFileSync(caCertPath, 'utf8');
        sslConfig = {
            ssl: {
                require: true,
                rejectUnauthorized: true,
                ca: caCert
            }
        };
        console.log('Using CA certificate for SSL connection');
    } else {
        // Fallback to basic SSL without certificate verification
        console.warn('CA certificate not found at', caCertPath, '- using SSL without certificate verification');
        sslConfig = {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        };
    }
}

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectOptions: {
            ...sslConfig,
            connectTimeout: 60000
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

module.exports = sequelize;