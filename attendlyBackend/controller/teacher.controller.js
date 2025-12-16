const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const redisClient = require('../db/redisClient');
const { Attendance, User } = require('../db/connectDb');
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

// Live attendance for a session/subject
const getLiveAttendance = asyncHandler(async (req, res) => {
    const user = req.user;

    const { sessionId, subjectId, since } = req.query || {};
    if (!sessionId) throw new ApiError(400, 'sessionId is required');

    const where = { sessionId, institutionId: user.institutionId };
    if (subjectId) where.subjectId = subjectId;
    if (since) where.createdAt = { $gte: new Date(since) };

    const rows = await Attendance.findAll({
        where,
        order: [['createdAt', 'DESC']],
    });

    // Deduplicate by userId keeping most recent
    const seen = new Set();
    const unique = [];
    for (const row of rows) {
        if (!seen.has(row.userId)) {
            seen.add(row.userId);
            unique.push(row);
        }
    }

    // Fetch user info for the unique list
    const userIds = unique.map(r => r.userId);
    const users = userIds.length
        ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email', 'role'] })
        : [];
    const idToUser = new Map(users.map(u => [u.id, u]));

    const attendees = unique.map(r => ({
        id: r.id,
        userId: r.userId,
        user: idToUser.get(r.userId) || null,
        subjectId: r.subjectId,
        sessionId: r.sessionId,
        latitude: r.latitude,
        longitude: r.longitude,
        ip: r.ip,
        createdAt: r.createdAt,
    }));

    return res.json(new ApiResponse(200, { attendees, count: attendees.length }, 'Live attendance'));
});

// SSE stream for real-time attendance updates
const streamLiveAttendance = asyncHandler(async (req, res) => {
    const user = req.user;
    const { sessionId } = req.query;

    if (!sessionId) throw new ApiError(400, 'sessionId is required');

    // Verify session exists and belongs to this teacher
    const sessionKey = `classSession:${sessionId}`;
    const sessionVal = await redisClient.get(sessionKey);
    if (!sessionVal) throw new ApiError(404, 'Session not found or expired');

    const session = JSON.parse(sessionVal);
    if (session.teacherId !== user.id) {
        throw new ApiError(403, 'Not authorized for this session');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection message with current attendance
    const where = { sessionId, institutionId: user.institutionId };
    const rows = await Attendance.findAll({
        where,
        order: [['createdAt', 'DESC']],
    });

    // Deduplicate by userId
    const seen = new Set();
    const unique = [];
    for (const row of rows) {
        if (!seen.has(row.userId)) {
            seen.add(row.userId);
            unique.push(row);
        }
    }

    // Fetch user info
    const userIds = unique.map(r => r.userId);
    const users = userIds.length
        ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'name', 'email', 'role'] })
        : [];
    const idToUser = new Map(users.map(u => [u.id, u]));

    const attendees = unique.map(r => ({
        id: r.id,
        userId: r.userId,
        user: idToUser.get(r.userId) || null,
        subjectId: r.subjectId,
        sessionId: r.sessionId,
        latitude: r.latitude,
        longitude: r.longitude,
        ip: r.ip,
        createdAt: r.createdAt,
    }));


    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ sessionId, count: attendees.length, attendees, timestamp: new Date() })}\n\n`);

    // Subscribe to Redis pub/sub for this session
    const subscriber = redisClient.duplicate();
    const channel = `attendance:${sessionId}`;

    // Listen for messages on the channel
    subscriber.on('message', (ch, message) => {
        if (ch === channel) {
            try {
                const data = JSON.parse(message);
                console.log('📨 SSE: Sending new_attendance event:', data.user?.name);
                res.write(`event: new_attendance\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (err) {
                console.error('SSE message error:', err);
            }
        }
    });

    // Subscribe to the channel
    await subscriber.subscribe(channel);
    console.log(`✅ SSE: Subscribed to channel: ${channel}`);

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(`:heartbeat\n\n`);
    }, 30000);

    // Send session expiry warning 5 minutes before
    const timeUntilExpiry = session.expiresInSeconds * 1000;
    const warningTime = timeUntilExpiry - (5 * 60 * 1000); // 5 minutes before
    let expiryWarning = null;

    if (warningTime > 0) {
        expiryWarning = setTimeout(() => {
            res.write(`event: session_expiring\n`);
            res.write(`data: ${JSON.stringify({ minutesLeft: 5, sessionId })}\n\n`);
        }, warningTime);
    }

    // Cleanup on client disconnect
    req.on('close', async () => {
        console.log(`🔌 SSE: Client disconnected from session: ${sessionId}`);
        clearInterval(heartbeat);
        if (expiryWarning) clearTimeout(expiryWarning);
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
        res.end();
    });
});

module.exports.getLiveAttendance = getLiveAttendance;
module.exports.streamLiveAttendance = streamLiveAttendance;
