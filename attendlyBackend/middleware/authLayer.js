const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { User } = require('../db/connectDb');

const authMiddleware = async (req, res, next) => {
    try {
        let token = req?.cookies?.token;

        // If not in cookie, try Authorization header
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!token && authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        if (!token) {
            throw new ApiError(401, 'Missing or invalid token');
        }

        // Verify JWT
        const decoded = jwt.verify(token, process.env.SECRET_TOKEN);

        // Attach user to request
        const user = await User.findByPk(decoded.id);
        if (!user) throw new ApiError(401, 'User not found');

        req.user = {
            id: user.id,
            role: user.role,
            institutionId: user.institutionId,
            email: user.email,
        };

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(err.statusCode || 401).json({ message: err.message || 'Unauthorized' });
    }
};

module.exports = authMiddleware;
