const express = require('express');
const router = express.Router();
const aiController = require('../../controllers/aiController');
const { authenticateJWT } = require('../../middleware/auth');


router.post('/generate', authenticateJWT, aiController.generateSurvey);


router.post('/refine', authenticateJWT, aiController.refineQuestion);

module.exports = router;