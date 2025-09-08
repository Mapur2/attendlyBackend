const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const readKmlFile = require("../utils/readKmlService");
const { Campus, Institution } = require("../db/connectDb.js");
const { completeStep } = require("../utils/onBoardingService.js");
const { Ip } = require("../db/connectDb.js");
const ApiResponse = require("../utils/ApiResponse.js");

const readFromKml = asyncHandler(async (req, res) => {
    const kmlPath = req?.file?.path;
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


module.exports = { readFromKml, addWifiDetails };