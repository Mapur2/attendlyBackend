# Swagger API Documentation - Quick Reference

## 🚀 Quick Start

1. **Start server**: `node index.js`
2. **Open docs**: http://localhost:3001/docs
3. **Test APIs**: Click "Try it out" on any endpoint

---

## 🔑 Authentication

### Get Token (Login First)

```bash
POST /auth/login
{
  "email": "your@email.com",
  "password": "yourpassword"
}
```

Copy the `accessToken` from response.

### Use Token in Swagger

1. Click **"Authorize"** button (top right)
2. Enter: `Bearer <your-token-here>`
3. Click "Authorize"

---

## 📚 Common API Flows

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

## 📤 File Upload Endpoints

### Face Verification
- **Endpoint**: `POST /student/verify-face`
- **Field**: `image` (binary)
- **Formats**: JPEG, PNG

### Face Registration
- **Endpoint**: `POST /onboard/student/face-detect`
- **Field**: `image` (binary)
- **Formats**: JPEG, PNG

### Campus Boundaries
- **Endpoint**: `POST /onboard/upload-kml`
- **Field**: `kml` (binary)
- **Format**: KML file

---

## 🎯 Testing Tips

### Test Without Auth
- `/auth/register-institution`
- `/auth/register`
- `/auth/login`
- `/auth/otp/verify-email`

### Test With Auth (Student)
- `/student/verify-face`
- `/student/join-class`
- `/academic/departments` (GET)
- `/academic/subjects` (GET)

### Test With Auth (Teacher)
- `/teacher/start-class`
- `/teacher/session/:id/qr`
- `/teacher/live-attendance`

### Test With Auth (Admin Only)
- `/academic/departments` (POST)
- `/academic/years` (POST)
- `/academic/subjects` (POST)
- `/onboard/upload-kml`
- `/onboard/add-ip`

---

## 🔧 Useful Endpoints

### Check License Status
```
GET /license/status
```

### Get All Campuses
```
GET /academic/campuses
```

### Get Departments
```
GET /academic/departments?campusId=1
```

### Get Subjects
```
GET /academic/subjects?yearId=1
```

---

## 📊 Response Format

All responses follow this structure:

```json
{
  "statusCode": 200,
  "data": { /* your data */ },
  "message": "Success message",
  "success": true
}
```

Error responses:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "success": false,
  "errors": []
}
```

---

## 🎨 Swagger UI Features

- **Try it out**: Test APIs directly
- **Authorize**: Add JWT token once
- **Schemas**: View request/response formats
- **Examples**: See sample data
- **Download**: Export OpenAPI spec

---

## 📱 For Frontend Developers

### Get OpenAPI Spec
```
http://localhost:3001/docs.json
```

Use this to:
- Generate TypeScript types
- Create API client libraries
- Import into Postman
- Share with team

---

## 🐛 Common Issues

### 401 Unauthorized
→ Click "Authorize" and add your token

### 403 Forbidden
→ Check your role (admin/teacher/student)

### 400 Bad Request
→ Check required fields in schema

### File Upload Not Working
→ Use `multipart/form-data` content type

---

## 💡 Pro Tips

1. **Bookmark** `/docs` for quick access
2. **Export** requests as cURL commands
3. **Share** `/docs.json` with frontend team
4. **Test** edge cases before deploying
5. **Document** custom fields in controllers

---

## 📞 Need Help?

- Check [walkthrough.md](file:///C:/Users/HP/.gemini/antigravity/brain/632e4ce1-e602-435a-b9e0-6b7a914700f0/walkthrough.md) for detailed guide
- Review [swagger.js](file:///d:/fullStack/SIH2025/attendly/attendlyBackend/swagger.js) for schema definitions
- Inspect route files for JSDoc comments
