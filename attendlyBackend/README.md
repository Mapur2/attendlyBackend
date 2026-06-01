# Attendly Backend

Attendance management system with geofencing, face recognition, and QR code-based class attendance.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start server
node index.js
```

Server runs at **http://localhost:3001**

---

## 📚 API Documentation

- Swagger UI: http://localhost:3001/docs
- OpenAPI JSON: http://localhost:3001/docs.json

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| Express.js | Web framework |
| PostgreSQL + Sequelize | Database & ORM |
| Redis (ioredis) | Caching |
| JWT + bcrypt | Authentication |
| Swagger UI | API documentation |
| PhonePe PG SDK | Payment integration |
| Cloudinary | File storage |

---

## 📁 Project Structure

```
attendlyBackend/
├── index.js              # Entry point
├── swagger.js            # OpenAPI config
├── controller/           # Business logic
│   ├── auth.controller.js
│   ├── student.controller.js
│   ├── teacher.controller.js
│   ├── academic.controller.js
│   ├── reports.controller.js
│   ├── license.controller.js
│   └── onboard.controller.js
├── routes/               # API routes
├── models/               # Sequelize models
│   ├── User.js
│   ├── Attendance.js
│   ├── Institution.js
│   ├── Campus.js
│   ├── Department.js
│   ├── Subject.js
│   ├── Year.js
│   ├── License.js
│   └── Ip.js
├── middleware/           # Auth, license, file upload
├── db/                   # Database connections
├── utils/                # Services (OTP, email, etc.)
└── payment/              # Payment service
```

---

## 🔑 Authentication

### Login
```bash
POST /auth/login
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

### Use Token in Requests
```
Authorization: Bearer <your-token>
```

---

## 📤 Common API Flows

### 1. Institution Registration
```
POST /auth/register-institution
→ Receive OTP via email
→ POST /auth/otp/verify-email
→ POST /auth/login
```

### 2. Student Registration
```
POST /auth/register (with institutionCode)
→ POST /auth/otp/verify-email
→ POST /auth/login
→ POST /onboard/student/face-detect (upload face)
```

### 3. Start Class & Mark Attendance
```
Teacher:
  POST /teacher/start-class
  → GET /teacher/session/:id/qr

Student:
  POST /student/verify-face (upload selfie)
  → POST /student/join-class (with sessionId + location)
```

---

## 📊 API Endpoints

| Route | Description |
|-------|-------------|
| `/auth` | Authentication (register, login, OTP) |
| `/license` | License management |
| `/onboard` | Onboarding (face upload, KML) |
| `/academic` | Campuses, departments, subjects |
| `/student` | Student attendance |
| `/teacher` | Teacher class management |
| `/reports` | Attendance reports |

---

## 🔧 Environment Variables

Create `.env` file:
```env
PORT=3001
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_CLOUD_NAME=...
EMAIL_USER=...
EMAIL_PASS=...
```

---

## ✅ Testing Tips

### Public Endpoints (No Auth)
- `/auth/register-institution`
- `/auth/register`
- `/auth/login`
- `/auth/otp/verify-email`

### Student Endpoints
- `/student/verify-face`
- `/student/join-class`
- `/academic/departments` (GET)

### Teacher Endpoints
- `/teacher/start-class`
- `/teacher/session/:id/qr`
- `/teacher/live-attendance`

### Admin Endpoints
- `/academic/departments` (POST)
- `/academic/years` (POST)
- `/onboard/upload-kml`
- `/onboard/add-ip`

---

## 📝 Response Format

```json
{
  "statusCode": 200,
  "data": { },
  "message": "Success",
  "success": true
}
```

---

## 📄 License

ISC