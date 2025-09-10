const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authLayer');
const { startClass, getSessionQR } = require('../controller/teacher.controller');
const licenseAuth = require('../middleware/licenseLayer');

router.post('/start-class', authMiddleware, startClass);
router.get('/session/:id/qr', authMiddleware,licenseAuth(["teacher"]),getSessionQR);

module.exports = router;
