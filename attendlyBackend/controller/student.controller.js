const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { User, Ip } = require("../db/connectDb.js");
const ApiResponse = require("../utils/ApiResponse.js");
const fs = require("fs/promises");


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
            try { await fs.unlink(filePath); } catch (_) {}
        }
    }
})

module.exports = { studentVerifyFace };