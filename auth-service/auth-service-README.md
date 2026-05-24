# Auth Service

Handles user registration, login, and JWT token verification. All other services rely on the API Gateway to verify tokens — Auth Service itself only needs to expose a `/verify` endpoint for the gateway.

---

## Port

```
3001
```

---

## Structure

```
auth-service/
├── src/
│   ├── config/
│   │   └── db.js               ← Neon PostgreSQL pool
│   ├── models/
│   │   └── user.model.js       ← users table queries
│   ├── controllers/
│   │   └── auth.controller.js  ← register, login, verify, profile
│   ├── routes/
│   │   └── auth.routes.js
│   └── app.js
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
PORT=3001
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/auth_db?sslmode=require
JWT_SECRET=your_long_random_secret_key
JWT_EXPIRES_IN=1d
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | Web server |
| pg | ^8.11.3 | PostgreSQL client |
| bcryptjs | ^2.4.3 | Password hashing |
| jsonwebtoken | ^9.0.2 | JWT sign and verify |
| dotenv | ^16.3.1 | Environment variables |

---

## Installation

```bash
npm install
```

---

## Database Setup

Create `auth_db` in your Neon project. The `users` table is created automatically on first start:

```sql
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Running

```bash
npm start       # production
npm run dev     # development with auto-reload
```

Expected output:
```
Auth Service connected to Neon PostgreSQL
Users table ready
Auth Service running on http://localhost:3001
```

---

## API Endpoints

All routes are prefixed with `/auth`. Access via gateway at `/api/auth/*`.

### POST /auth/register
Register a new user.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response 201:**
```json
{
  "message": "User registered successfully",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

### POST /auth/login
Login and receive a JWT token.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response 200:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

### POST /auth/verify
Called internally by API Gateway to validate tokens. Not meant to be called directly by clients.

**Header:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "user": { "userId": 1, "email": "john@example.com", "role": "user", "name": "John Doe" }
}
```

---

### GET /auth/profile
Get the currently logged-in user's profile. Requires token (via gateway).

**Response 200:**
```json
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

## Health Check

```bash
curl http://localhost:3001/health
```

---

## Make a User Admin

Run directly in Neon SQL Editor (auth_db):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

Admin users can:
- View all orders (`GET /api/orders`)
- Update order status (`PATCH /api/orders/:id/status`)
- Update and delete any product
