const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    const payload = {
        user_id: user.user_id,
        role: user.role
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

module.exports = { generateToken };