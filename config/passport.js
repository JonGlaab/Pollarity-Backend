const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

// Local Strategy
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return done(null, false, { message: 'Incorrect email.' });
        }
        const isMatch = await user.validPassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const existingUser = await User.findOne({ where: { google_id: profile.id } });
        if (existingUser) {
            return done(null, existingUser);
        }
        const existingEmailUser = await User.findOne({ where: { email: profile.emails[0].value } });
        if (existingEmailUser) {
            existingEmailUser.google_id = profile.id;
            await existingEmailUser.save();
            return done(null, existingEmailUser);
        }
        const newUser = await User.create({
            google_id: profile.id,
            email: profile.emails[0].value,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
        });
        return done(null, newUser);
    } catch (err) {
        return done(err);
    }
}));

// Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const existingUser = await User.findOne({ where: { facebook_id: profile.id } });
        if (existingUser) {
            return done(null, existingUser);
        }
        const existingEmailUser = await User.findOne({ where: { email: profile.emails[0].value } });
        if (existingEmailUser) {
            existingEmailUser.facebook_id = profile.id;
            await existingEmailUser.save();
            return done(null, existingEmailUser);
        }
        const newUser = await User.create({
            facebook_id: profile.id,
            email: profile.emails[0].value,
            first_name: profile.name.givenName,
            last_name: profile.name.familyName,
        });
        return done(null, newUser);
    } catch (err) {
        return done(err);
    }
}));

// JWT Strategy
const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
        const user = await User.findByPk(jwt_payload.user_id);
        if (user) {
            return done(null, user);
        }
        return done(null, false);
    } catch (err) {
        return done(err, false);
    }
}));