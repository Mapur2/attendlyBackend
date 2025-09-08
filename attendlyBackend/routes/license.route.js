const express = require('express');

const router = express.Router();

const {
    createOrder,
    verifyPayment,
    activateLicense,
    deactivateLicense,
    getLicenseStatus,
} = require('../controller/license.controller.js');
const authMiddleware = require('../middleware/authLayer.js');
const licenseAuth = require('../middleware/licenseLayer.js');


router.get('/verify-payment', verifyPayment);

router.use(authMiddleware)

router.post('/buy',createOrder);
router.post('/activate', activateLicense);
router.post('/deactivate', deactivateLicense);
router.get('/status',licenseAuth(["admin","student","teacher"]), getLicenseStatus);

module.exports = router;


