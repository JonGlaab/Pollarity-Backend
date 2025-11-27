const express = require('express');
const router = express.Router();

const { authenticateJWT, isAdmin, checkBanned } = require('../../middleware/auth');

const User = require('../../models/user');
const db = require('../../models');
const Survey=db.Survey;

router.get('/users', [authenticateJWT, isAdmin], async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'role', 'isBanned']
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/ban/:userId', [authenticateJWT, checkBanned, isAdmin], async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }


        const newBanStatus = !user.isBanned;
        user.isBanned = newBanStatus;
        await user.save();

        if (newBanStatus) {
            await Survey.update(
                { status: 'closed' },
                {
                    where: {
                        creator_user_id: user.user_id,
                        status: 'published'
                    }
                }
            );
        }

        const action = newBanStatus ? "banned" : "unbanned";
        res.json({ message: `User ${user.email} has been ${action}.`, isBanned: newBanStatus });
    } catch (error) {
        console.error("Ban error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;