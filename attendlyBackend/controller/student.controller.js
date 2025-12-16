const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { User, Ip, Campus, Attendance } = require("../db/connectDb.js");
const ApiResponse = require("../utils/ApiResponse.js");
const fs = require("fs/promises");
const redis = require("../db/redisClient.js");

// Ray-casting algorithm for point in polygon
function isPointInPolygon(lng, lat, polygonLngLat) {
    let inside = false;
    for (let i = 0, j = polygonLngLat.length - 1; i < polygonLngLat.length; j = i++) {
        const xi = polygonLngLat[i][0], yi = polygonLngLat[i][1];
        const xj = polygonLngLat[j][0], yj = polygonLngLat[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) &&
            (lng < (xj - xi) * (lat - yi) / ((yj - yi) || 1e-12) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}


const studentVerifyFace = asyncHandler(async (req, res) => {
    const file = req?.file;
    if (!file) throw new ApiError(400, "Image file is required");

    // Ensure student is on institution WiFi (client IP must be whitelisted)
    const rawIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.connection?.remoteAddress || "";
    const clientIp = rawIp.replace("::ffff:", "");

    const ipRow = await Ip.findOne({ where: { institutionId: req.user.institutionId } });
    const allowedIps = ipRow?.ips || [];

    // Allow localhost for development only if explicitly enabled
    const devAllowed = process.env.ALLOW_LOCALHOST_IP === "true" && (clientIp === "127.0.0.1" || clientIp === "::1");

    if (!devAllowed && !allowedIps.includes(clientIp)) {
        throw new ApiError(403, "Please connect to your campus WiFi to verify attendance");
    }

    const me = await User.findByPk(req.user.id)
    if (!me || !me.faceImageUrl) throw new ApiError(400, "No reference face stored")

    const faceServiceBase = process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000";
    const endpoint = `${faceServiceBase.replace(/\/$/, "")}/verify-face`;

    const filePath = file.path;
    try {
        const buffer = await fs.readFile(filePath);
        const formData = new FormData();
        const blob = new Blob([buffer], { type: file.mimetype || "image/jpeg" });
        formData.append("file", blob, file.originalname || "image.jpg");
        formData.append("url", me.faceImageUrl)

        const resp = await fetch(endpoint, { method: "POST", body: formData });
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            throw new ApiError(resp.status || 500, data?.detail || "Face service error");
        }

        return res.status(200).json(new ApiResponse(200, data, data.verified ? "Face verified" : "Face not matched"));
    } finally {
        if (filePath) {
            try { await fs.unlink(filePath); } catch (_) { }
        }
    }
})

// Join class via QR: validate session, WiFi, and geofence
const joinClassSession = asyncHandler(async (req, res) => {
    const { sessionId, latitude, longitude } = req.body || {};
    if (!sessionId) throw new ApiError(400, "sessionId is required");
    if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new ApiError(400, "latitude and longitude are required numbers");
    }

    // Check session in Redis (optional presence)
    const sessionKey = `classSession:${sessionId}`;
    const sessionVal = await redis.get(sessionKey);
    if (!sessionVal) throw new ApiError(404, "Session not found or expired");
    let subjectId = null;
    try {
        const parsed = JSON.parse(sessionVal);
        subjectId = parsed?.subjectId || parsed?.data?.subjectId || null;
    } catch (_) {
        // keep subjectId null if parsing fails
    }
    // WiFi check
    const rawIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.connection?.remoteAddress || "";
    const clientIp = rawIp.replace("::ffff:", "");
    const ipRow = await Ip.findOne({ where: { institutionId: req.user.institutionId } });
    const allowedIps = ipRow?.ips || [];
    const devAllowed = process.env.ALLOW_LOCALHOST_IP === "true";
    if (!devAllowed && !allowedIps.includes(clientIp)) {
        throw new ApiError(403, "Connect to campus WiFi to join the class");
    }

    // Geofence check against any campus polygon of user's institution
    const campuses = await Campus.findAll({ where: { institutionId: req.user.institutionId } });
    const isInsideAny = campuses.some(c => {
        const ring = Array.isArray(c.coordinates) ? c.coordinates : [];
        // Stored as [lng, lat, alt]; we use [lng, lat]
        const polygon = ring.map(pt => [pt[0], pt[1]]);
        return polygon.length >= 3 && isPointInPolygon(longitude, latitude, polygon);
    });
    if (!isInsideAny) throw new ApiError(403, "You are outside the campus perimeter");

    // Persist attendance record
    const attendanceRecord = await Attendance.create({
        sessionId,
        userId: req.user.id,
        institutionId: req.user.institutionId,
        subjectId: subjectId,
        ip: clientIp,
        latitude,
        longitude,
        metadata: { source: "qr", method: "wifi+geofence" }
    });

    // Fetch user details for real-time notification
    const student = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'role']
    });

    // Publish to Redis for SSE subscribers (real-time updates)
    const eventData = {
        id: attendanceRecord.id,
        userId: req.user.id,
        user: student,
        sessionId,
        subjectId,
        latitude,
        longitude,
        ip: clientIp,
        createdAt: attendanceRecord.createdAt,
        timestamp: new Date().toISOString()
    };

    await redis.publish(
        `attendance:${sessionId}`,
        JSON.stringify(eventData)
    );

    return res.status(200).json(new ApiResponse(200, { sessionId, subjectId }, "Joined class and marked present"));
});


module.exports = { studentVerifyFace, joinClassSession };