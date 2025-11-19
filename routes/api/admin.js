const express = require('express');
const router = express.Router();
const { authenticateJWT, isAdmin, checkBanned } = require('../../middleware/auth');
const User = require('../../models/user');

router.post('/ban/:userId', [authenticateJWT, checkBanned, isAdmin], async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBanned = true;
        await user.save();

        res.json({ message: `User ${user.email} has been banned.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;