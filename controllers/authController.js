const passport = require('passport');
const User = require('../models/user');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

const generateJwtToken = (user) => {
    const payload = {
        id: user.user_id,
        email: user.email,
        role: user.role
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};


exports.register = [
    check('email').isEmail().withMessage('Please enter a valid email address.'),
    check('password').isLength({ min: 8, max: 20 }).withMessage('Password must be between 8 and 20 characters.'),
    check('first_name').not().isEmpty().withMessage('First name is required.'),
    check('last_name').not().isEmpty().withMessage('Last name is required.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, first_name, last_name } = req.body;

        try {
            let user = await User.findOne({ where: { email } });
            if (user) {
                return res.status(400).json({ message: 'User already exists' });
            }

            user = await User.create({
                email,
                password,
                first_name,
                last_name
            });

            const token = generateJwtToken(user);

            
            res.status(201).json({
                token,
                user: {
                    id: user.user_id,
                    email: user.email,
                    role: user.role,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    user_photo_url: user.user_photo_url
                }
            });

        } catch (error) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
];

exports.login = (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).json({ message: info.message || "Login failed" });
        }

        const token = generateJwtToken(user);


        return res.json({
            token: token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                user_photo_url: user.user_photo_url
            },
            message: "Login successful"
        });
    })(req, res, next);
};

exports.googleLogin = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleCallback = (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect('/login');
        }

        if (!user.first_name || !user.last_name) {
            const registrationToken = jwt.sign({ temp_id: user.id, provider: 'google' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            return res.redirect(`/complete-registration?token=${registrationToken}`);
        }

        const token = generateJwtToken(user);
        res.redirect(`/?token=${token}`);
    })(req, res, next);
};

exports.completeRegistration = [
    check('first_name').not().isEmpty().withMessage('First name is required.'),
    check('last_name').not().isEmpty().withMessage('Last name is required.'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { token, first_name, last_name } = req.body;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let user;
            if (decoded.provider === 'google') {
                user = await User.findOne({where: {google_id: decoded.temp_id}});
            } else if (decoded.provider === 'facebook') {
                user = await User.findOne({where: {facebook_id: decoded.temp_id}});
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            user.first_name = first_name;
            user.last_name = last_name;
            await user.save();

            const jwtToken = generateJwtToken(user);
            res.status(200).json({ token: jwtToken });

        } catch (error) {
            res.status(500).json({ message: 'Server error or invalid token', error: error.message });
        }
    }
];