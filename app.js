const env=require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('express-session');
const db = require('./models');

const app = express();


app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));


app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie:{
        httpOnly: true,
        // secure: process.env.COOKIE_SECRET,
        secure: process.env.NODE_ENV === 'production', // true in production (HTTPS), false in development
        maxAge: 300000
    }
}))
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

const routes=require('./routes');
app.use(routes);


const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Sync database: create missing tables and add missing columns
        const isProduction = process.env.NODE_ENV === 'production';
        
        const syncOptions = {
            alter: true,  // alter: true - adds missing columns without dropping existing data
            force: false  // force: false - never drops tables (safety for production)
        };

        if (isProduction) {
            console.log("Running in production mode - using safe sync options");
        }

        await db.sequelize.sync(syncOptions);
        console.log("Database tables synchronized successfully");
        console.log("All tables are up to date with model definitions");
        
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to sync database:", err);
        process.exit(1); // Exit on database sync failure
    }
};

startServer();


