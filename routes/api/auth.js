const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require('../../utils/jwt');
const { check, validationResult } = require('express-validator');
const User = require('../../models/user');


router.post('/register', [
    check('email').isEmail(),
    check('password').isLength({ min: 8 }),
    check('first_name').not().isEmpty(),
    check('last_name').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, first_name, last_name, confirmPassword } = req.body;

    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const newUser = await User.create({
            email,
            password,
            confirmPassword,
            first_name,
            last_name
        });

        const token = generateToken(newUser);
        res.status(201).json({ token });

    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors.map(e => e.message).join(', ') });
        }
        res.status(500).json({ message: 'Server error' });
    }
});


// Local login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.status(400).json({
                message: info ? info.message : 'Login failed',
                user   : user
            });
        }
        const token = generateToken(user);
        return res.json({ token });
    })(req, res, next);
});

// Google authentication
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login', session: false }), (req, res) => {
    const token = generateToken(req.user);
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendURL}/?token=${token}`);
});

// Facebook authentication
// router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
//
// router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login', session: false }), (req, res) => {
//     const token = generateToken(req.user);
//     res.redirect(`/?token=${token}`);
// });

module.exports = router;