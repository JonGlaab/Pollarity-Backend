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
        // Also attempt to decode the raw JWT to expose its payload (helpful when passport returns a minimal user)
        try {
            const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization);
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                // expose token payload fields directly for convenience
                req.tokenPayload = payload;
                if (!req.user.user_id && payload.user_id) {
                    // attach a convenient user_id field if missing on the user object
                    req.user.user_id = payload.user_id;
                }
            }
        } catch (e) {

            console.warn('Failed to decode JWT in authenticateJWT middleware', e.message);
        }
        next();
    })(req, res, next);
};

const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
    }
    next();
};

const checkBanned = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
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
