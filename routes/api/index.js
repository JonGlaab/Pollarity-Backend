const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const surveyRoutes = require('./surveys');
const userRoutes = require('./users');
const aiRoutes = require('./ai');


router.use('/auth', authRoutes);
router.use('/surveys', surveyRoutes);
router.use('/admin', adminRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);

module.exports = router;