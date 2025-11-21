const express = require('express');
const router = express.Router();

// Our main router simply mounts the API routes. Because app.js already prefixes
// `/api`, we expose the API router at the root of this file.
const apiRouter = require('./api');

router.use('/', apiRouter);

module.exports = router;