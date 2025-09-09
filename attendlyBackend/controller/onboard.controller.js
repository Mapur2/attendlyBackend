const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const readKmlFile = require("../utils/readKmlService");
const { Campus, Institution } = require("../db/connectDb.js");
const { completeStep } = require("../utils/onBoardingService.js");
const { Ip } = require("../db/connectDb.js");
const ApiResponse = require("../utils/ApiResponse.js");
const path = require("path");
const fs = require("fs/promises");
const { uploadImageBuffer } = require("../utils/cloudinary.js");
const { User } = require("../db/connectDb.js");

const readFromKml = asyncHandler(async (req, res) => {
    const kmlPath = req?.file?.path;
    console.log(req?.file)
    if (!kmlPath) {
        throw new ApiError(400, "KML file is required");
    }

    // Parse KML
    const campuses = await readKmlFile(kmlPath);

    if (!campuses || campuses.length === 0) {
        throw new ApiError(400, "No campus data found in KML");
    }

    const institutionId = req?.user?.institutionId || req?.body?.institutionId;
    // Store in DB
    const savedCampuses = [];
    for (const campus of campuses) {
        const created = await Campus.create({
            name: campus.name,
            institutionId: institutionId || null,
            coordinates: campus.coordinates[0],
        });
        savedCampuses.push(created);
    }

    const progress = await completeStep(req.user.id,req.user.institutionId, "kmlUpload");

    if (!progress) {
        throw new ApiError(500, "Error in saving progress")
    }

    await Institution.update(
        { numberOfCampus: savedCampuses.length },
        { where: { id: institutionId } }
    );

    return res
        .status(201)
        .json(new ApiResponse(201, {progress}, "Campuses stored successfully"));
});

const addWifiDetails = asyncHandler(async (req, res) => {
    const { wifiIps } = req.body;
    if (!wifiIps || wifiIps.length === 0) {
        throw new ApiError(400, "WiFi IPs are required");
    }

    let ipRecord = await Ip.findOne({ where: { institutionId: req?.user?.institutionId } });

    if (ipRecord) {
        // merge old + new unique IPs
        const updatedIps = [...new Set([...ipRecord.ips, ...wifiIps])];
        await ipRecord.update({ ips: updatedIps });
    } else {
        await Ip.create({
            institutionId: req.user.institutionId,
            ips: wifiIps,
        });
    }

    const progress = await completeStep(req.user.id,req.user.institutionId, "wifiSetup");

    return res.json(new ApiResponse(200, { progress }, "WiFi setup completed"));
});



// Student onboarding - face detection proxy to Python service (store in Cloudinary)
const studentFaceDetect = asyncHandler(async (req, res) => {
    const file = req?.file;
    if (!file) {
        throw new ApiError(400, "Image file is required");
    }

    const faceServiceBase = process.env.FACE_SERVICE_URL || "http://127.0.0.1:8000";
    const endpoint = `${faceServiceBase.replace(/\/$/, "")}/detect-face`;

    const filePath = file.path;
    let imageUrl = null;
    try {
        // 1) Forward to Python for single-face validation using the saved file
        const buffer = await fs.readFile(filePath);
        const formData = new FormData();
        const blob = new Blob([buffer], { type: file.mimetype || "image/jpeg" });
        formData.append("file", blob, file.originalname || "image.jpg");

        const resp = await fetch(endpoint, { method: "POST", body: formData });
        const data = await resp.json().catch(() => ({}));
        console.log(data)
        if (!data.ok) {
            throw new ApiError(400, data?.detail || "Face not valid");
        }

        // 2) If detection succeeded, upload image to Cloudinary and mark onboarded
        if (data?.ok === true) {
            const uploadRes = await uploadImageBuffer(buffer, file.originalname || "image.jpg")
            imageUrl = uploadRes.secure_url
            if (!imageUrl) throw new ApiError(500, "Failed to upload image")
            await User.update({ faceImageUrl: imageUrl, isOnboarded: true }, { where: { id: req.user.id } })
        }

        const payload = { ...data, imageUrl }
        return res.status(200).json(new ApiResponse(200, payload, data.ok ? "Face detected" : "Face not valid"));
    } finally {
        if (filePath) {
            try { await fs.unlink(filePath); } catch (_) {}
        }
    }
});

module.exports = { readFromKml, addWifiDetails, studentFaceDetect };