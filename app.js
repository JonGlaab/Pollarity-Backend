require('dotenv').config();
const express = require('express');
const passport = require('passport');
const db = require('./models');
const routes = require('./routes');
const cors = require('cors');

const app = express();

// --- CORS Configuration ---
const corsOptions = {
    // Allow requests from your local React development server (port 3000)
    origin: 'http://localhost:3000',

    // Allow credentials (cookies/JWTs) to be sent, which your login/auth needs
    credentials: true,

    // Allow the necessary methods and headers
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};

// Use the CORS middleware before any routes
app.use(cors(corsOptions));
// --------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(passport.initialize());

// Passport config
require('./config/passport');

// Routes
app.use('/api', routes);

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
        process.exit(1);
    }
};

startServer();