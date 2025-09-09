const express = require('express');
const { createDepartment, listDepartments, addYear, listYears, addSubject, listSubjects } = require('../controller/academic.controller');
const authMiddleware = require('../middleware/authLayer');
const licenseAuth = require('../middleware/licenseLayer');

const router = express.Router();

router.post('/departments', authMiddleware, licenseAuth(["admin"]), createDepartment);
router.get('/departments', authMiddleware, licenseAuth(["admin","teacher","student"]), listDepartments);

router.post('/years', authMiddleware, licenseAuth(["admin"]), addYear);
router.get('/years', authMiddleware, licenseAuth(["admin","teacher","student"]), listYears);

router.post('/subjects', authMiddleware, licenseAuth(["admin"]), addSubject);
router.get('/subjects', authMiddleware, licenseAuth(["admin","teacher","student"]), listSubjects);

module.exports = router;


