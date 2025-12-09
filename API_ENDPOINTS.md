# 🚀 ConceptVella API Endpoints - Complete List

**Base URL:** `https://your-backend-url.com` (or `http://localhost:4000` for dev)

**All endpoints return JSON**

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [Authentication](#authentication)
3. [Profile Management](#profile-management)
4. [Challenges](#challenges)
5. [Admin Endpoints](#admin-endpoints)

---

## 🏥 Health Check

### GET /health
**Description:** Check if API is running

**Authorization:** None

**Request:**
```
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## 🔐 Authentication

### POST /auth/register
**Description:** Register new user with optional profile fields

**Authorization:** None

**Required Fields:**
- `email` (string) - User's email address
- `password` (string) - User's password (minimum 6 characters)

**Optional Fields:**
- `username` (string) - Unique username (3-20 chars, alphanumeric + underscore/hyphen)
- `display_name` (string) - Display name
- `bio` (string) - User bio
- `location` (string) - User location
- `vehicle_type` (string) - Vehicle type (e.g., "SUV", "Sedan", "Motorcycle")
- `avatar_url` (string) - URL to avatar image

**Request Body (Minimal):**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Request Body (Complete):**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "username": "johndoe",
  "display_name": "John Doe",
  "bio": "Road trip enthusiast from Melbourne",
  "location": "Melbourne, Australia",
  "vehicle_type": "SUV",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {
      "id": "uuid",
      "username": "johndoe",
      "display_name": "John Doe",
      "bio": "Road trip enthusiast",
      "location": "Melbourne, Australia",
      "vehicle_type": "SUV",
      "avatar_url": "https://example.com/avatar.jpg",
      "role": "user",
      "created_at": "2025-12-07T10:00:00Z",
      "updated_at": "2025-12-07T10:00:00Z"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."  // null if email confirmation enabled
}
```

**Error (400) - Missing required fields:**
```json
{
  "error": "Email and password are required"
}
```

**Error (400) - Username validation:**
```json
{
  "error": "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens"
}
```

**Error (400) - Username taken:**
```json
{
  "error": "Username is already taken"
}
```

---

### POST /auth/login
**Description:** Login and get access token

**Authorization:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "display_name": "John Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_at": 1702987200
}
```

**Error (401):**
```json
{
  "error": "Invalid login credentials"
}
```

---

### POST /auth/logout
**Description:** Logout user (invalidate session)

**Authorization:** Required (Bearer token)

**Request:**
```
POST /auth/logout
Authorization: Bearer YOUR_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /auth/me
**Description:** Get current authenticated user info

**Authorization:** Required (Bearer token)

**Request:**
```
GET /auth/me
Authorization: Bearer YOUR_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "profile": {
      "id": "uuid",
      "display_name": "John Doe",
      "avatar_url": null,
      "bio": null,
      "role": "user",
      "created_at": "2025-12-07T10:00:00Z",
      "updated_at": "2025-12-07T10:00:00Z"
    }
  }
}
```

---

### POST /auth/forgot-password
**Description:** Request password reset email

**Authorization:** None

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

---

### POST /auth/reset-password
**Description:** Reset password with token from email

**Authorization:** None

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewPassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Error (400):**
```json
{
  "error": "Invalid or expired reset token"
}
```

---

### POST /auth/verify-code
**Description:** Verify OTP or reset code

**Authorization:** None

**Request Body:**
```json
{
  "email": "user@example.com",
  "token": "otp_code",
  "type": "recovery"  // 'email' | 'sms' | 'phone_change' | 'recovery'
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Code verified successfully",
  "session": { ... }
}
```

---

## 👤 Profile Management

### GET /auth/profile
**Description:** Get current user's profile with stats

**Authorization:** Required (Bearer token)

**Request:**
```
GET /auth/profile
Authorization: Bearer YOUR_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": "Road trip enthusiast",
    "location": "Melbourne, Australia",
    "vehicle_type": "SUV",
    "avatar_url": "https://...",
    "role": "user",
    "created_at": "2025-12-07T10:00:00Z",
    "updated_at": "2025-12-07T10:00:00Z",
    "stats": {
      "posts": 5,
      "followers": 12,
      "following": 8
    }
  }
}
```

---

### PUT /auth/profile
**Description:** Update current user's profile

**Authorization:** Required (Bearer token)

**Request Body:**
```json
{
  "username": "johndoe",           // optional, must be unique, 3-20 chars, alphanumeric + underscore/hyphen
  "display_name": "John Doe",      // optional
  "bio": "Road trip enthusiast",   // optional
  "location": "Melbourne, Australia", // optional
  "vehicle_type": "SUV",           // optional
  "avatar_url": "https://..."      // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": "Road trip enthusiast",
    "location": "Melbourne, Australia",
    "vehicle_type": "SUV",
    "avatar_url": "https://...",
    "stats": {
      "posts": 5,
      "followers": 12,
      "following": 8
    }
  }
}
```

**Error (400):**
```json
{
  "error": "Username is already taken"
}
```

---

### GET /auth/profile/:username
**Description:** Get public profile by username

**Authorization:** None

**Request:**
```
GET /auth/profile/johndoe
```

**Response (200):**
```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "username": "johndoe",
    "display_name": "John Doe",
    "bio": "Road trip enthusiast",
    "location": "Melbourne, Australia",
    "vehicle_type": "SUV",
    "avatar_url": "https://...",
    "created_at": "2025-12-07T10:00:00Z",
    "stats": {
      "posts": 5,
      "followers": 12,
      "following": 8
    }
  }
}
```

**Error (404):**
```json
{
  "error": "Profile not found"
}
```

---

### GET /auth/username/check
**Description:** Check if username is available

**Authorization:** None

**Query Parameters:**
- `username` (required): Username to check

**Request:**
```
GET /auth/username/check?username=johndoe
```

**Response (200):**
```json
{
  "available": true,
  "message": "Username is available"
}
```

**Or if taken:**
```json
{
  "available": false,
  "message": "Username is already taken"
}
```

**Or if invalid format:**
```json
{
  "available": false,
  "message": "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens"
}
```

---

## 🏆 Challenges

### GET /challenges
**Description:** List active challenges (optionally filter by region)

**Authorization:** None

**Query Parameters:**
- `region` (optional): Filter by region code (e.g., "VIC", "SA", "QLD")

**Request:**
```
GET /challenges
GET /challenges?region=VIC
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "title": "Great Ocean Road Explorer",
    "description": "Visit 5 iconic locations along the Great Ocean Road",
    "type": "vella",
    "difficulty": "moderate",
    "region_code": "VIC",
    "status": "active",
    "starts_at": "2025-01-01T00:00:00Z",
    "ends_at": "2025-12-31T23:59:59Z",
    "created_at": "2025-12-07T10:00:00Z"
  }
]
```

---

### POST /challenges/:id/join
**Description:** Join a challenge

**Authorization:** Required (Bearer token)

**Request:**
```
POST /challenges/uuid/join
Authorization: Bearer YOUR_TOKEN
```

**Response (201):**
```json
{
  "id": "uuid",
  "challenge_id": "uuid",
  "user_id": "uuid",
  "status": "in_progress",
  "progress_data": {},
  "started_at": "2025-12-07T10:00:00Z",
  "created_at": "2025-12-07T10:00:00Z"
}
```

**If already joined (200):**
```json
{
  "id": "uuid",
  "challenge_id": "uuid",
  "user_id": "uuid",
  "status": "in_progress",
  ...
}
```

**Error (404):**
```json
{
  "error": "Challenge not found"
}
```

**Error (400):**
```json
{
  "error": "Challenge is not active"
}
```

---

## 👨‍💼 Admin Endpoints

**All admin endpoints require:** Authorization: Bearer token (with admin role)

---

### GET /admin/test/google-api
**Description:** Test Google Places API connection

**Authorization:** Required (Admin)

**Request:**
```
GET /admin/test/google-api
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Google Places API is working! Found 20 parks near Melbourne.",
  "sampleResults": [
    {
      "name": "Royal Botanic Gardens",
      "place_id": "ChIJ...",
      "address": "..."
    }
  ]
}
```

---

### POST /admin/test/import-sample
**Description:** Import 20 test POIs (for testing)

**Authorization:** Required (Admin)

**Request:**
```
POST /admin/test/import-sample
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sample import completed!",
  "stats": {
    "region": "VIC-TEST",
    "searched": 20,
    "unique": 20,
    "inserted": 20
  }
}
```

---

### POST /admin/import/region
**Description:** Import POIs from Google Places for a region

**Authorization:** Required (Admin)

**Request Body:**
```json
{
  "region": "VIC",
  "types": ["campground", "park", "tourist_attraction", "natural_feature"],
  "centerLat": -37.8136,
  "centerLng": 144.9631,
  "radius": 200000  // optional, default 50000
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Import completed for VIC",
  "stats": {
    "region": "VIC",
    "searched": 150,
    "unique": 145,
    "inserted": 145
  }
}
```

**Error (400):**
```json
{
  "error": "Missing required fields: region, types, centerLat, centerLng"
}
```

---

### GET /admin/pois/stats
**Description:** Get POI import statistics

**Authorization:** Required (Admin)

**Request:**
```
GET /admin/pois/stats
Authorization: Bearer ADMIN_TOKEN
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total": 145,
    "byRegion": {
      "VIC": 100,
      "VIC-TEST": 20,
      "SA": 25
    },
    "byType": {
      "park": 80,
      "campground": 40,
      "tourist_attraction": 25
    }
  }
}
```

---

## 🔑 Authorization

### How to Use Bearer Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Format

- **Type:** JWT (JSON Web Token)
- **Expiry:** 1 hour (default)
- **How to get:** Login via `/auth/login` or register via `/auth/register`

### Role-Based Access

- **user:** Default role, can access user endpoints
- **moderator:** Can moderate content (future feature)
- **admin:** Can access admin endpoints

---

## 📊 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (resource created) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## 🚨 Error Response Format

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

Or for success responses:

```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

---

## 📝 Notes

1. **CORS:** Enabled for:
   - `http://localhost:8080`
   - `https://conceptvella.vercel.app`
   - `https://www.conceptvella.com`

2. **Content-Type:** All requests should use `application/json`

3. **Token Storage:** Store token in localStorage or state management after login

4. **Token Expiry:** Tokens expire after 1 hour - user needs to login again

5. **Registration Optional Fields:**
   - All profile fields can be set during registration: `username`, `display_name`, `bio`, `location`, `vehicle_type`, `avatar_url`
   - If not provided, can be set later via `PUT /auth/profile`
   - Username is validated during registration (format + uniqueness)

6. **Username Validation:**
   - 3-20 characters
   - Only letters, numbers, underscores, hyphens
   - Must be unique
   - Validated during registration and profile updates

7. **Profile Stats:**
   - `posts`: Count from experiences table
   - `followers`: Placeholder (0) until implemented
   - `following`: Placeholder (0) until implemented

---

## 🧪 Testing

### Quick Test with cURL

```bash
# Health check
curl https://your-backend-url.com/health

# Register (minimal)
curl -X POST https://your-backend-url.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Register (with optional profile fields)
curl -X POST https://your-backend-url.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser","display_name":"Test User","bio":"Road trip enthusiast","location":"Melbourne, Australia","vehicle_type":"SUV"}'

# Login
curl -X POST https://your-backend-url.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get profile (replace TOKEN)
curl https://your-backend-url.com/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

---

**That's all the endpoints we've built! 🚀**

