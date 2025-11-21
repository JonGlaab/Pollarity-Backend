
// !!! TEMPORARY MOCK AUTHENTICATION FOR DEVELOPMENT !!!
const mockAuth = (req, res, next) => {
    console.warn('ATTENTION: Using MOCK AUTH. Skipping JWT check.');

    req.user = {
        user_id: 1,
        role: 'user',
        isBanned: false
    };
    next();
};

module.exports = mockAuth;