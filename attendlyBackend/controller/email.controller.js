const sendEmail = require('../utils/sendEmail.js');
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const  asyncHandler  = require('../utils/asyncHandler');

const testSendEmail = asyncHandler(async (req, res) => {
    const { email, message } = req.body;
    
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const content = message || "<p>This is a test email sent from the Attendly API.</p>";

    const result = await sendEmail(email, content);

    if (!result) {
        throw new ApiError(500, "Failed to send email");
    }

    return res.status(200).json(new ApiResponse(200, result, "Email sent successfully"));
});

module.exports = {
    testSendEmail
};
