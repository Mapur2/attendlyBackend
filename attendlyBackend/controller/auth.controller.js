const { Institution, User } = require('../db/connectDb.js');
const { hashPassword, comparePassword } = require('../utils/bcryptService.js');
const asyncHandler = require('../utils/asyncHandler.js');
const ApiError = require('../utils/ApiError.js');
const ApiResponse = require('../utils/ApiResponse.js');
const sendEmail = require("../utils/sendEmail.js");
const jwt = require('jsonwebtoken')
const { generateOtp, saveOtp, verifyOtp } = require('../utils/otpService.js');


const newCollegeCode = async () => {
    const lastInstitution = await Institution.findOne({
        order: [["createdAt", "DESC"]],
    });

    let nextCode = "10000";
    const institution = lastInstitution?.dataValues;
    if (institution && institution.code) {
        const lastCodeNum = parseInt(institution.code)
        nextCode = String(lastCodeNum + 1);
    } else {
        nextCode = "100000";
    }

    return nextCode;
};


const registerInstitution = asyncHandler(async (req, res) => {

    const { institutionName, institutionEmail, password, phone } = req.body;
    if (!institutionName || !institutionEmail || !password || !phone) {
        throw new ApiError(400, 'All fields are required');
    }

    const hashedPassword = await hashPassword(password);
    const nextCode = await newCollegeCode();
    console.log(nextCode)
    const newInstitution = await Institution.create({
        name: institutionName,
        email: institutionEmail,
        phone,
        code: nextCode
    });

    if (!newInstitution) {
        throw new ApiError(500, 'Institution creation failed');
    }

    if (!newInstitution.code) {
        throw new ApiError(500, 'Institution code generation failed');
    }


    const newAdminUser = await User.create({
        name: institutionName + ' Admin',
        email: institutionEmail,
        password: hashedPassword,
        role: 'admin',
        phone,
        institutionId: newInstitution.id,
        collegeCode: newInstitution.code,
        emailVerified: false,
        isOnboarded: false
    });
    const otp = generateOtp()
    await saveOtp(newAdminUser.id, otp);
    const emailRecieved = await sendEmail(institutionEmail, "Here's your OTP: <b>" + otp + "</b>. Valid for 5 minutes.");
    if (emailRecieved == null)
        throw new ApiError(500, "Something went wrong while sending email")

    res.status(201).json(new ApiResponse(201, { newInstitution, admin: newAdminUser }, 'Institution registered successfully. We please verify your email by entering the OTP, sent to you email address'));
});

const registerStudentTeacher = asyncHandler(async (req, res) => {
    const { name, email, password, phone, institutionCode, role } = req.body;

    if (!name || !email || !password || !phone || !institutionCode || !role) {
        throw new ApiError(400, 'All fields are required');
    }

    // find institution by code
    const institution = await Institution.findOne({ where: { code: institutionCode } });
    if (!institution) {
        throw new ApiError(404, 'Institution not found');
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        institutionId: institution.id,
        collegeCode: institution.code,
        emailVerified: false,
        isOnboarded: false
    });

    if (!newUser) {
        throw new ApiError(500, 'Student registration failed');
    }

    const token = await generateAccessToken(newUser);

    const otp = generateOtp();
    await saveOtp(newUser.id, otp);
    const emailRecieved = await sendEmail(email, "Here's your OTP: <b>" + otp + "</b>. Valid for 5 minutes.");
    if (emailRecieved == null)
        throw new ApiError(500, "Something went wrong while sending email");


    res.status(201).json(new ApiResponse(201, { user: newUser, accessToken:token }, 'Student registered successfully. Please verify your email using OTP.'));
});


const verifyUserEmail = asyncHandler(async (req, res) => {
    const { otp, email } = req.body;
    if (!otp || !email) {
        return res.status(400).json(new ApiResponse(400, "OTP and email required"))
    }
    const user = await User.findOne({ where: { email } })
    console.log("verifying user", user)
    if (user.emailVerified)
        throw new ApiError(400, "Email already verified")

    const verify = await verifyOtp(user.id, otp)
    if (!verify.success)
        throw new ApiError(400, verify.message)

    user.emailVerified = true
    await user.save()

    return res.status(200).json(new ApiResponse(200, verify.message))
})
const generateAccessToken = (user) => {
    try {
        return jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            process.env.SECRET_TOKEN,
            {
                expiresIn: process.env.SECRET_TOKEN_EXPIRY,
            }
        );
    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while creating access token");
    }
};

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email) throw new ApiError(400, "Email is required");
    if (!password) throw new ApiError(400, "Password is required");

    const user = await User.findOne({ where: { email } });
    if (!user) throw new ApiError(404, "User does not exist");

    const passCheck = await comparePassword(password, user.password);
    if (!passCheck) throw new ApiError(401, "Invalid password");

    const accessToken = generateAccessToken(user);

    res.cookie("token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'strict' //prevent CSRF attack
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user, // already fetched
                    accessToken,
                },
                "User logged in successfully"
            )
        );
});


module.exports = {
    registerInstitution, verifyUserEmail, loginUser, registerStudentTeacher
};