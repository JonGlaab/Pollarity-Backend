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
        secure: process.env.COOKIE_SECRET,
        maxAge: 300000
    }
}))
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

const routes=require('./routes');
app.use(routes);


const PORT = process.env.PORT ;

const startServer= async ()=>{
    try{
        await db.sequelize.sync();
        console.log("DB connection successfully created");
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
    })
    }catch(err){
        console.error("Failed to sync db:", err);
    }
};
startServer();


