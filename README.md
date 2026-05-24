# Node.js Microservices — Auth + Product + API Gateway (Neon DB)

A production-style microservices setup with:
- **Auth Service** (port 3001) — register, login, JWT verification
- **Product Service** (port 3002) — full CRUD, protected via gateway headers
- **API Gateway** (port 3000) — single entry point, rate limiting, token verification, request proxying

All traffic goes through port 3000 only. Auth and Product services bind to `127.0.0.1`.

---

## Project Structure

```
microservices/
├── api-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   ← calls Auth Service to verify token
│   │   │   └── rateLimiter.js      ← 100 req / 15 min per IP
│   │   ├── routes/
│   │   │   └── proxy.js            ← http-proxy-middleware config
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
├── auth-service/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js               ← Neon PostgreSQL pool
│   │   ├── models/
│   │   │   └── user.model.js
│   │   ├── controllers/
│   │   │   └── auth.controller.js
│   │   ├── routes/
│   │   │   └── auth.routes.js
│   │   └── app.js
│   ├── .env.example
│   └── package.json
│
└── product-service/
    ├── src/
    │   ├── config/
    │   │   └── db.js               ← Neon PostgreSQL pool
    │   ├── models/
    │   │   └── product.model.js
    │   ├── controllers/
    │   │   └── product.controller.js
    │   ├── middleware/
    │   │   └── auth.middleware.js
    │   ├── routes/
    │   │   └── product.routes.js
    │   └── app.js
    ├── .env.example
    └── package.json
```

---

## Prerequisites

- Node.js >= 18
- A free Neon account at https://neon.tech

---

## Step 1 — Create Neon Databases

1. Go to https://neon.tech and sign up / log in
2. Create a **new project** (e.g. `microservices`)
3. Inside the project, create **two databases**:
   - `auth_db`
   - `product_db`

   You can create extra databases from the Neon dashboard → your project → **Databases** tab → **New Database**.

4. For each database, go to **Connection Details**, select the database name from the dropdown, and copy the connection string. It looks like:

```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/auth_db?sslmode=require
```

Tables (`users`, `products`) are created automatically when services start.

---

## Step 2 — Set Up Auth Service

```bash
cd auth-service
cp .env.example .env
```

Edit `.env`:

```env
PORT=3001
DATABASE_URL=postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/auth_db?sslmode=require
JWT_SECRET=any_long_random_string_here
JWT_EXPIRES_IN=1d
```

```bash
npm install
npm start
```

Expected output:
```
Auth Service connected to Neon PostgreSQL
Users table ready
Auth Service running on http://127.0.0.1:3001
```

---

## Step 3 — Set Up Product Service

```bash
cd product-service
cp .env.example .env
```

Edit `.env`:

```env
PORT=3002
DATABASE_URL=postgresql://username:password@ep-xxxx.us-east-2.aws.neon.tech/product_db?sslmode=require
```

```bash
npm install
npm start
```

Expected output:
```
Product Service connected to Neon PostgreSQL
Products table ready
Product Service running on http://127.0.0.1:3002
```

---

## Step 4 — Set Up API Gateway

```bash
cd api-gateway
cp .env.example .env
```

`.env`:
```env
PORT=3000
AUTH_SERVICE_URL=http://127.0.0.1:3001
PRODUCT_SERVICE_URL=http://127.0.0.1:3002
```

```bash
npm install
npm start
```

Expected output:
```
API Gateway running on http://localhost:3000
  → Auth Service    : http://127.0.0.1:3001
  → Product Service : http://127.0.0.1:3002
```

---

## Step 5 — Test With curl

**All requests go to port 3000 (the gateway).**

### Register a user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'
```

### Login and get a token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'
```

Copy the `token` from the response.

### Create a product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Laptop","description":"A fast laptop","price":999.99,"stock":10}'
```

### Get all products

```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get a single product

```bash
curl http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get your own products

```bash
curl http://localhost:3000/api/products/mine \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update a product

```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"price":899.99,"stock":8}'
```

### Delete a product

```bash
curl -X DELETE http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Health checks

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/auth/profile | Yes | Get logged-in user profile |
| GET | /api/products | Yes | Get all products |
| GET | /api/products/mine | Yes | Products you created |
| GET | /api/products/:id | Yes | Get product by ID |
| POST | /api/products | Yes | Create product |
| PUT | /api/products/:id | Yes | Update (owner or admin only) |
| DELETE | /api/products/:id | Yes | Delete (owner or admin only) |

---

## How It Works

```
Client
  │
  ▼
API Gateway (:3000)
  ├── Rate limiter (100 req / 15 min per IP)
  ├── Auth Middleware
  │     └── POST http://127.0.0.1:3001/auth/verify
  │           ├── valid   → injects x-user-id, x-user-email, x-user-role headers
  │           └── invalid → returns 401
  │
  ├── /api/auth/*     → proxy → Auth Service (:3001) → Neon auth_db
  └── /api/products/* → proxy → Product Service (:3002) → Neon product_db
```

---

## Admin Role

Update a user's role directly in Neon SQL Editor:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

Admins can update and delete any product, not just their own.

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SSL connection required` | Missing SSL config | Already handled — make sure `?sslmode=require` is in your DATABASE_URL |
| `password authentication failed` | Wrong credentials in DATABASE_URL | Copy connection string fresh from Neon dashboard |
| `database does not exist` | Wrong DB name in connection string | Create both `auth_db` and `product_db` in Neon dashboard |
| `ECONNREFUSED` on gateway | Auth or Product service not running | Start all three services first |
| `401 Authorization header missing` | Forgot to send Bearer token | Add Authorization header |
| `503 Auth Service unavailable` | Auth Service is down | Restart auth-service |
