const express = require('express');
const { testSendEmail } = require('../controller/email.controller.js');
const router = express.Router();

router.post('/test', testSendEmail);

module.exports = router;
