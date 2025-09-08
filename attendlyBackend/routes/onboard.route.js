const express = require('express');
const upload = require('../middleware/multer');
const { readFromKml, addWifiDetails } = require('../controller/onboard.controller');
const licenseAuth = require('../middleware/licenseLayer');
const authMiddleware = require('../middleware/authLayer');

const router = express.Router();


router.route("/upload-kml").post(authMiddleware,licenseAuth(["admin"]),upload.single("kml"),readFromKml)
router.route("/add-ip").post(authMiddleware,licenseAuth(["admin"]),addWifiDetails)

module.exports = router;