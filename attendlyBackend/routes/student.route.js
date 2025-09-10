const express = require('express');
const upload = require('../middleware/multer');
const { studentVerifyFace, joinClassSession } = require('../controller/student.controller.js');
const licenseAuth = require('../middleware/licenseLayer');
const authMiddleware = require('../middleware/authLayer');

const router = express.Router();

router.route("/verify-face").post(authMiddleware,licenseAuth(["student","admin","teacher"]), upload.single("image"), studentVerifyFace)
// router.post('/join-class', authMiddleware, licenseAuth(["student","admin","teacher"]), joinClassSession)
router.route("/join-class").post(authMiddleware, licenseAuth(["student","admin","teacher"]), joinClassSession)

module.exports = router;