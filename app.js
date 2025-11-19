require('dotenv').config();
const express = require('express');
const passport = require('passport');
const db = require('./models');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());

// Passport config
require('./config/passport');

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await db.sequelize.sync();
        console.log("DB connection successfully created");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to sync db:", err);
    }
};

startServer();