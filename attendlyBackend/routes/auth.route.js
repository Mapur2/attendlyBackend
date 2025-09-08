const express = require('express');

const router = express.Router();

const { registerInstitution, verifyUserEmail, loginUser, registerStudentTeacher } = require('../controller/auth.controller.js');

router.post('/register-institution', registerInstitution);
router.post("/register",registerStudentTeacher)
router.post("/otp/verify-email",verifyUserEmail)
router.post("/login",loginUser)

module.exports = router;