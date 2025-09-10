const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const redisClient = require('../db/redisClient');
const QRCode = require('qrcode');
const crypto = require('crypto');

const START_CLASS_TTL_SECONDS = 60 * 60; // 15 minutes

const startClass = asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) throw new ApiError(401, 'Unauthorized');
    if (user.role && user.role !== 'teacher') {
        throw new ApiError(403, 'Only teachers can start a class');
    }

    const { subjectId, departmentId, yearId, section } = req.body || {};

    if (!subjectId) throw new ApiError(400, 'subjectId is required');

    const sessionId = crypto.randomUUID();
    const sessionKey = `classSession:${sessionId}`;

    const sessionPayload = {
        sessionId,
        teacherId: user.id,
        institutionId: user.institutionId,
        subjectId,
        departmentId: departmentId || null,
        yearId: yearId || null,
        section: section || null,
        createdAt: new Date().toISOString(),
        expiresInSeconds: START_CLASS_TTL_SECONDS
    };

    await redisClient.set(sessionKey, JSON.stringify(sessionPayload), 'EX', START_CLASS_TTL_SECONDS);

    const qrPayload = {
        t: 'attendly.session',
        v: 1,
        sessionId,
        subjectId,
        institutionId: user.institutionId
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));

    return res.status(201).json(
        new ApiResponse(201, {
            sessionId,
            ttlSeconds: START_CLASS_TTL_SECONDS,
            qrDataUrl,
            qrPayload
        }, 'Class session started')
    );
});

const getSessionQR = asyncHandler(async (req, res) => {
    // Build the payload for this sessionId
    const payload = { t: 'attendly.session', v: 1, sessionId: req.params.id, institutionId: req.user.institutionId };
    const png = await QRCode.toBuffer(JSON.stringify(payload), { errorCorrectionLevel: 'M' });
    res.type('png').send(png);
  });

module.exports = { startClass, getSessionQR };
