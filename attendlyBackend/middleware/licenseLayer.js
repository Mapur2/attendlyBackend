const { License } = require('../db/connectDb');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const redis = require('../db/redisClient.js');

const licenseAuth = (requiredRoles = []) => {
    return async (req, res, next) => {
        try {
            const user = req.user; // Auth middleware must attach user
            if (!user) throw new ApiError(401, 'Unauthorized');

            const institutionId = user.institutionId;
            if (!institutionId) throw new ApiError(400, 'User has no institution assigned');

            const cacheKey = `license:${institutionId}`;

            // ✅ Check Redis cache first
            let licenseData = await redis.get(cacheKey);
            if (licenseData) {
                licenseData = JSON.parse(licenseData);
            } else {
                // Fetch latest active license from DB
                licenseData = await License.findOne({
                    where: { institutionId, status: "active" },
                    order: [['issuedAt', 'DESC']],
                });

                if (licenseData) {
                    // Cache it with TTL equal to license expiry or 1 hour fallback
                    const ttl = 3600;
                    await redis.set(cacheKey, JSON.stringify(licenseData), 'EX', ttl);
                }
            }

            if (!licenseData) {
                throw new ApiError(403, 'No valid license found for this user');
            }

            // ✅ Check role
            if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
                throw new ApiError(403, 'Insufficient permissions');
            }

            // Attach license info to request for downstream use
            req.license = licenseData;

            next();
        } catch (err) {
            console.error('License Auth Middleware Error:', err);
            const apiError = err instanceof ApiError
                ? err
                : new ApiError(500, 'Internal Server Error');
            return res.status(apiError.statusCode).json(new ApiResponse(apiError.statusCode, null, apiError.message));
        }
    };
};

module.exports = licenseAuth;
