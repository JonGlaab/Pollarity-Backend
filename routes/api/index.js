const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin');

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;