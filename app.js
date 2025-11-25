const env = require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser'); // REQUIRED for signed JWT cookies
const passport = require('passport');
const session = require('express-session'); // REQUIRED for Passport
const db = require('./models');
const routes = require('./routes');
const cors = require('cors');

const app = express();


app.set('trust proxy', 1);

// --- CORS Configuration ---
const corsOptions = {
    origin: [
        'http://localhost:3000',               // For local React development
        'https://pollarity-frontend.onrender.com' // For the live deployed site
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
};

app.use(cors(corsOptions));
// --------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Cookie Parser (REQUIRED before sessions and passport)
app.use(cookieParser(process.env.COOKIE_SECRET));


// Initialize Session Middleware (REQUIRED for Passport)
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        // Set secure to true for production (HTTPS on Render) and false locally (HTTP)
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour
    }
}));


app.use(passport.initialize());
app.use(passport.session());

require('./config/passport');

// Routes
app.get('/', (req, res) => {
    res.send('Pollarity API is running 🚀');
});
app.use('/api', routes);


const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        // For development, reset the DB on every start.
        // For production, assume the DB schema is managed manually or with migrations.
        if (process.env.NODE_ENV !== 'production') {
            await db.sequelize.sync({ alter: true });
            console.log("Database tables synchronized successfully (alter: true).");
        } else {
            await db.sequelize.authenticate();
            console.log("Database connection authenticated successfully (production).");
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
};

startServer();