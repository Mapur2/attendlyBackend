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
const studentRoutes = require('./routes/student.route.js')
const teacherRoutes = require('./routes/teacher.route.js')

app.use('/auth', authRoutes);
app.use('/license', licenseRoutes);
app.use("/onboard",onboardingRoutes)
app.use('/academic', academicRoutes)
app.use("/student", studentRoutes)
app.use('/teacher', teacherRoutes)
app.get("/", (req, res) => {
    res.send("Attendly Backend is running");
})

connectDb().then(() => {
    app.listen(port,"0.0.0.0" ,() => {
        console.log(`Server running at http://0.0.0.0:${port}`);
    });
})