const express = require('express');
require('dotenv').config();
const http = require('http');
const app = express();
const port = process.env.PORT || 3001;
const cookieParser = require('cookie-parser');
const { connectDb, ClassNote, User, Subject } = require('./db/connectDb.js');
const cors = require("cors");
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { setupWebSocket } = require('./websocket/noteHandler');

const path = require('path');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
const allowedOrigins = [
    "https://attendly-beryl.vercel.app",
    "http://localhost:5173",
    "http://localhost:3001"
];
app.use(cors({
    origin: function (origin, callback) {
        // allow REST tools like Postman (no origin)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));
app.use(cookieParser());

const authRoutes = require('./routes/auth.route.js');
const licenseRoutes = require('./routes/license.route.js');
const onboardingRoutes = require("./routes/onboard.route.js")
const academicRoutes = require('./routes/academic.route.js')
const studentRoutes = require('./routes/student.route.js')
const teacherRoutes = require('./routes/teacher.route.js')
const reportsRoutes = require('./routes/reports.route.js')
const notesRoutes = require('./routes/notes.route.js')
const emailRoutes = require('./routes/email.route.js')

app.use('/auth', authRoutes);
app.use('/license', licenseRoutes);
app.use("/onboard", onboardingRoutes)
app.use('/academic', academicRoutes)
app.use("/student", studentRoutes)
app.use('/teacher', teacherRoutes)
app.use('/reports', reportsRoutes)
app.use('/notes', notesRoutes)
app.use('/email', emailRoutes)

// Swagger Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Attendly API Documentation",
    customfavIcon: "/favicon.ico"
}));

// Raw OpenAPI spec in JSON format
app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.get("/", (req, res) => {
    res.send("Attendly Backend is running");
})

// Create shared HTTP server (required to attach WebSocket server on same port)
const server = http.createServer(app);

connectDb().then(() => {
    // Attach WebSocket server after DB is ready so models are available
    setupWebSocket(server, { ClassNote, User, Subject });

    server.listen(port, "0.0.0.0", () => {
        console.log(`Server running at http://0.0.0.0:${port}`);
        console.log(`WebSocket note-taking available at ws://0.0.0.0:${port}/ws/notes`);
    });
})