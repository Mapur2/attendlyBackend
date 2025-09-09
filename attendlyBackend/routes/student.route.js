const express = require('express');
const upload = require('../middleware/multer');
const { studentVerifyFace } = require('../controller/student.controller.js');
const licenseAuth = require('../middleware/licenseLayer');
const authMiddleware = require('../middleware/authLayer');

const router = express.Router();

router.route("/verify-face").post(authMiddleware,licenseAuth(["student","admin","teacher"]), upload.single("image"), studentVerifyFace)

module.exports = router;