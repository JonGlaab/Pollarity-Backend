const passport = require('passport');
const User = require('../models/user');

const authenticateJWT = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        next();
    })(req, res, next);
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
};

const checkBanned = (req, res, next) => {
    if (req.user.isBanned) {
        return res.status(403).json({ message: 'Account suspended' });
    }
    next();
};

module.exports = {
    authenticateJWT,
    isAdmin,
    checkBanned
};