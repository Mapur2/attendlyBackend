const swaggerJSDoc = require("swagger-jsdoc");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Attendly API",
            version: "1.0.0",
            description: "Comprehensive API documentation for Attendly - Face Recognition Attendance System",
            contact: {
                name: "Attendly Team",
                email: "support@attendly.com"
            }
        },
        servers: [
            {
                url: "https://90nhxh89-3001.inc1.devtunnels.ms",
                description: "Development server"
            },
            {
                url: "https://90nhxh89-3001.inc1.devtunnels.ms",
                description: "Production server"
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter your JWT token"
                },
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "token",
                    description: "JWT token stored in cookie"
                }
            },
            schemas: {
                // Auth Schemas
                RegisterInstitution: {
                    type: "object",
                    required: ["institutionName", "institutionEmail", "password", "phone"],
                    properties: {
                        institutionName: {
                            type: "string",
                            example: "MIT College of Engineering"
                        },
                        institutionEmail: {
                            type: "string",
                            format: "email",
                            example: "admin@mit.edu"
                        },
                        password: {
                            type: "string",
                            format: "password",
                            minLength: 6,
                            example: "SecurePass123"
                        },
                        phone: {
                            type: "string",
                            pattern: "^[0-9]{10}$",
                            example: "9876543210"
                        }
                    }
                },
                RegisterUser: {
                    type: "object",
                    required: ["name", "email", "password", "phone", "institutionCode", "role"],
                    properties: {
                        name: {
                            type: "string",
                            example: "John Doe"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "john.doe@student.mit.edu"
                        },
                        password: {
                            type: "string",
                            format: "password",
                            minLength: 6,
                            example: "SecurePass123"
                        },
                        phone: {
                            type: "string",
                            example: "9876543210"
                        },
                        institutionCode: {
                            type: "string",
                            example: "100000"
                        },
                        role: {
                            type: "string",
                            enum: ["student", "teacher"],
                            example: "student"
                        }
                    }
                },
                VerifyEmail: {
                    type: "object",
                    required: ["otp", "email"],
                    properties: {
                        otp: {
                            type: "string",
                            pattern: "^[0-9]{6}$",
                            example: "123456"
                        },
                        email: {
                            type: "string",
                            format: "email",
                            example: "john.doe@student.mit.edu"
                        }
                    }
                },
                Login: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            example: "john.doe@student.mit.edu"
                        },
                        password: {
                            type: "string",
                            format: "password",
                            example: "SecurePass123"
                        }
                    }
                },
                // Academic Schemas
                CreateDepartment: {
                    type: "object",
                    required: ["name", "campusId"],
                    properties: {
                        name: {
                            type: "string",
                            example: "Computer Science"
                        },
                        campusId: {
                            type: "integer",
                            example: 1
                        }
                    }
                },
                AddYear: {
                    type: "object",
                    required: ["name", "departmentId"],
                    properties: {
                        name: {
                            type: "string",
                            example: "First Year"
                        },
                        departmentId: {
                            type: "string",
                            example: "100000"
                        }
                    }
                },
                AddSubject: {
                    type: "object",
                    required: ["name", "code", "yearId","departmentId"],
                    properties: {
                        name: {
                            type: "string",
                            example: "Data Structures"
                        },
                        code: {
                            type: "string",
                            example: "CS201"
                        },
                        yearId: {
                            type: "string",
                            example: "100000"
                        },
                        departmentId:{
                            type:"string",
                            example:"afjowi-asas-asax6782"
                        }
                    }
                },
                // Teacher Schemas
                StartClass: {
                    type: "object",
                    required: ["subjectId", "duration"],
                    properties: {
                        subjectId: {
                            type: "string",
                            example: "100000"
                        },
                        duration: {
                            type: "string",
                            description: "Duration in minutes",
                            example: 60
                        }
                    }
                },
                // Student Schemas
                JoinClass: {
                    type: "object",
                    required: ["sessionId", "latitude", "longitude"],
                    properties: {
                        sessionId: {
                            type: "string",
                            example: "100000"
                        },
                        latitude: {
                            type: "number",
                            format: "double",
                            example: 19.0760
                        },
                        longitude: {
                            type: "number",
                            format: "double",
                            example: 72.8777
                        }
                    }
                },
                // Onboarding Schemas
                AddWifiDetails: {
                    type: "object",
                    required: ["ssid", "ipRange", "campusId"],
                    properties: {
                        ssid: {
                            type: "string",
                            example: "MIT-Campus-WiFi"
                        },
                        ipRange: {
                            type: "string",
                            example: "192.168.1.0/24"
                        },
                        campusId: {
                            type: "integer",
                            example: 1
                        }
                    }
                },
                // License Schemas
                CreateOrder: {
                    type: "object",
                    required: ["amount", "licenseType"],
                    properties: {
                        amount: {
                            type: "number",
                            example: 5000
                        },
                        licenseType: {
                            type: "string",
                            enum: ["monthly", "yearly"],
                            example: "monthly"
                        }
                    }
                },
                // Response Schemas
                ApiResponse: {
                    type: "object",
                    properties: {
                        statusCode: {
                            type: "integer",
                            example: 200
                        },
                        data: {
                            type: "object"
                        },
                        message: {
                            type: "string",
                            example: "Success"
                        },
                        success: {
                            type: "boolean",
                            example: true
                        }
                    }
                },
                ApiError: {
                    type: "object",
                    properties: {
                        statusCode: {
                            type: "integer",
                            example: 400
                        },
                        message: {
                            type: "string",
                            example: "Bad Request"
                        },
                        success: {
                            type: "boolean",
                            example: false
                        },
                        errors: {
                            type: "array",
                            items: {
                                type: "string"
                            }
                        }
                    }
                },
                User: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },
                        name: {
                            type: "string",
                            example: "John Doe"
                        },
                        email: {
                            type: "string",
                            example: "john.doe@student.mit.edu"
                        },
                        role: {
                            type: "string",
                            enum: ["admin", "teacher", "student"],
                            example: "student"
                        },
                        phone: {
                            type: "string",
                            example: "9876543210"
                        },
                        institutionId: {
                            type: "integer",
                            example: 1
                        },
                        collegeCode: {
                            type: "string",
                            example: "100000"
                        },
                        emailVerified: {
                            type: "boolean",
                            example: true
                        },
                        isOnboarded: {
                            type: "boolean",
                            example: false
                        }
                    }
                },
                Institution: {
                    type: "object",
                    properties: {
                        id: {
                            type: "integer",
                            example: 1
                        },
                        name: {
                            type: "string",
                            example: "MIT College of Engineering"
                        },
                        email: {
                            type: "string",
                            example: "admin@mit.edu"
                        },
                        phone: {
                            type: "string",
                            example: "9876543210"
                        },
                        code: {
                            type: "string",
                            example: "100000"
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: "Auth",
                description: "Authentication and user registration endpoints"
            },
            {
                name: "Academic",
                description: "Academic structure management (departments, years, subjects)"
            },
            {
                name: "Teacher",
                description: "Teacher-specific operations (class sessions, QR codes, attendance)"
            },
            {
                name: "Student",
                description: "Student-specific operations (face verification, joining classes)"
            },
            {
                name: "License",
                description: "License management and payment operations"
            },
            {
                name: "Onboarding",
                description: "Institution onboarding (campus setup, WiFi configuration)"
            }
        ]
    },
    apis: ["./routes/*.js"], // Path to the API routes
};

module.exports = swaggerJSDoc(options);
