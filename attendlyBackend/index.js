const express = require('express');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3001;
const cookieParser = require('cookie-parser');
const { connectDb } = require('./db/connectDb.js');
const cors = require("cors")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: "*",
    credentials: true // allow frontend to access cookies
}));
app.use(cookieParser());

const authRoutes = require('./routes/auth.route.js');
const licenseRoutes = require('./routes/license.route.js');
const onboardingRoutes = require("./routes/onboard.route.js")
const academicRoutes = require('./routes/academic.route.js')

app.use('/auth', authRoutes);
app.use('/license', licenseRoutes);
app.use("/onboard",onboardingRoutes)
app.use('/academic', academicRoutes)

connectDb().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
})