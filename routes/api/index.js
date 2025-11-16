const express = require('express');
const router = express.Router();

const authRoutes=require('./auth');
const surveyRoutes=require('./surveys');

router.use('/auth',authRoutes);