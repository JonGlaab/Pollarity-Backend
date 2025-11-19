// Currently not using passport strategies, but keeping this file for future OAuth integration

module.exports = (passport) => {
    // Passport strategies can be configured here
    // Example for future use:
    // const LocalStrategy = require('passport-local').Strategy;
    // passport.use(new LocalStrategy(...));
    
    // Serialize/deserialize user for session support
    passport.serializeUser((user, done) => {
        done(null, user.user_id);
    });
    
    passport.deserializeUser(async (id, done) => {
        try {
            const db = require('../models');
            const user = await db.User.findByPk(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });
};

