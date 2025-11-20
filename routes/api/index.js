const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const adminRoutes = require('./admin');
const surveyRoutes = require('./surveys');


router.use('/auth',authRoutes);
router.use('/surveys',surveyRoutes)
router.use('/admin',adminRoutes)