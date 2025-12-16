const asyncHandler = require('../utils/asyncHandler.js');
const ApiResponse = require('../utils/ApiResponse.js');
const ApiError = require('../utils/ApiError.js');
const { License } = require("../db/connectDb.js")
const client = require("../payment/paymentService.js")
const { randomUUID } = require("crypto")
const { MetaInfo, StandardCheckoutPayRequest } = require("pg-sdk-node");
const { Op } = require('sequelize');

// POST /license/create-order
const createOrder = asyncHandler(async (req, res) => {
    const { type } = req.body || {};
    const institutionId = req?.user?.institutionId || req?.body?.institutionId

    if (!type) {
        throw new ApiError(400, "Type of license is required")
    }
    if (!institutionId) {
        throw new ApiError(400, "Institution id is required")
    }

    const existingLicense = await License.findOne({
        where: {
            institutionId,
            status: "active",
            expiresAt: { [Op.gt]: new Date() },
        },
    });

    if (existingLicense) {
        return res.status(200).json(
            new ApiResponse(200, {
                licenseId: existingLicense.id,
                licenseKey: existingLicense.licenseKey,
                status: existingLicense.status,
                expiresAt: existingLicense.expiresAt,
            }, "Institution already has a valid license")
        );
    }

    const merchantOrderId = randomUUID();
    const licenseKey = `LIC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const issuedAt = new Date();
    let expiresAt = new Date(issuedAt);
    switch (type) {
        case "monthly":
            expiresAt.setMonth(expiresAt.getMonth() + 1);
            break;
        case "quarterly":
            expiresAt.setMonth(expiresAt.getMonth() + 3);
            break;
        case "annually":
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            break;
        default:
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // fallback yearly
    }

    const license = await License.create({
        licenseKey,
        type,
        status: "pending",
        issuedAt,
        expiresAt,
        institutionId
    });

    const amount = 10000;
    const redirectUrl = `${process.env.FRONTEND_URL}/license/verify-payment?merchantOrderId=${merchantOrderId}&licenseKey=${licenseKey}`;

    const request = StandardCheckoutPayRequest.builder()
        .merchantOrderId(merchantOrderId)
        .amount(amount)
        .redirectUrl(redirectUrl)
        .build();

    let response;
    try {
        response = await client.pay(request);
    } catch (payErr) {
        console.error("PhonePe payment request failed:", payErr);

        // Mark license as revoked if initiation fails
        await license.update({ status: "revoked" });

        throw new ApiError(502, "Failed to connect with payment gateway")
    }

    // Step 4: Validate response from PhonePe
    if (!response || !response.redirectUrl || response.state !== "PENDING") {
        await license.update({ status: "revoked" });
        throw new ApiError(400, "Payment initiation failed")
    }

    return res.status(200).json(
        new ApiResponse(200, {
            licenseId: license.id,
            licenseKey: license.licenseKey,
            redirectUrl: response.redirectUrl,
            orderId: response.orderId,
            state: response.state,
        }, "License purchase initiated")
    );
});

// POST /license/verify-payment
const verifyPayment = asyncHandler(async (req, res) => {
    const { merchantOrderId, licenseKey } = req.query;

    if (!merchantOrderId || !licenseKey) {
        throw new ApiError(400, "merchantOrderId and licenseKey are required");
    }
    console.log("verifying payment ", merchantOrderId, licenseKey)

    // Build status request
    const response = await client.getOrderStatus(merchantOrderId)
    console.log(response)
    const status = response?.state;

    if (status === "COMPLETED") {
        await License.update(
            { status: "active" },
            { where: { licenseKey } }
        );
        return res.redirect(`${process.env.FRONTEND_URL}/payment/success`)
    } else if (status === "FAILED") {
        await License.update(
            { status: "revoked" },
            { where: { licenseKey } }
        );
        return res.redirect(`${process.env.FRONTEND_URL}/payment/failure`)
    } else {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/pending`)
    }
});


// POST /license/activate
const activateLicense = asyncHandler(async (req, res) => {
    // Expect: licenseKey or derived from verified payment
    // TODO: Mark license active and persist mapping to user/institution
    return res.status(200).json(new ApiResponse(200, { activated: false }, 'License activation (stub)'));
});

// POST /license/deactivate
const deactivateLicense = asyncHandler(async (req, res) => {
    // Expect: licenseKey or id
    // TODO: Mark license revoked/expired
    return res.status(200).json(new ApiResponse(200, { deactivated: false }, 'License deactivation (stub)'));
});

const getLicenseStatus = asyncHandler(async (req, res) => {
    const { institutionId } = req.user;
    if (!institutionId) throw new ApiError(400, 'institutionId is required');

    // Fetch latest license for the institution
    const license = await License.findOne({
        where: { institutionId },
        order: [['issuedAt', 'DESC']], // latest license first
    });

    if (!license) {
        return res.status(200).json(
            new ApiResponse(200, { institutionId, status: 'none' }, 'No license found for this institution')
        );
    }

    // Check expiry
    const now = new Date();
    if (license.expiresAt && license.expiresAt < now && license.status === "active") {
        await license.update({ status: "expired" });
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                institutionId,
                licenseKey: license.licenseKey,
                type: license.type,
                status: license.status,
                issuedAt: license.issuedAt,
                expiresAt: license.expiresAt,
            },
            "License status fetched successfully"
        )
    );
});

module.exports = {
    createOrder,
    verifyPayment,
    activateLicense,
    deactivateLicense,
    getLicenseStatus,
};


