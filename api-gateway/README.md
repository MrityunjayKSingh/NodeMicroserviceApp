# API Gateway

Single entry point for all microservices. Handles rate limiting, JWT verification via Auth Service, and proxies requests to downstream services.

---

## Responsibilities

- Receives all incoming HTTP requests on port 3000
- Rate limits to 100 requests per IP per 15 minutes
- Verifies JWT token by calling Auth Service `/auth/verify`
- Injects user identity as headers (`x-user-id`, `x-user-email`, `x-user-role`) for downstream services
- Proxies requests to the correct microservice

---

## Port

```
3000
```

---

## Structure

```
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── authMiddleware.js   ← calls Auth Service to verify JWT
│   │   └── rateLimiter.js      ← 100 req / 15 min per IP
│   ├── routes/
│   │   └── proxy.js            ← proxy config for all services
│   └── app.js
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | Web server |
| http-proxy-middleware | ^2.0.6 | Request proxying |
| axios | ^1.6.2 | Calls Auth Service to verify token |
| express-rate-limit | ^7.1.5 | Rate limiting |
| dotenv | ^16.3.1 | Environment variables |

> **Important:** Use http-proxy-middleware v2.0.6 specifically. v3+ and v4+ have breaking changes with body forwarding.

---

## Installation

```bash
npm install
```

---

## Running

```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

---

## Route Mapping

| Gateway Route | Proxied To | Auth Required |
|---|---|---|
| /api/auth/* | Auth Service :3001/auth/* | No |
| /api/products/* | Product Service :3002/products/* | Yes |
| /api/orders/* | Order Service :3003/orders/* | Yes |
| /api/payments/* | Payment Service :3004/payments/* | Yes |

---

## How Auth Works

For every protected route the gateway:

1. Reads `Authorization: Bearer <token>` header
2. Calls `POST http://localhost:3001/auth/verify` with the token
3. On success — injects these headers before proxying:
   - `x-user-id`
   - `x-user-email`
   - `x-user-role`
   - `x-user-name`
4. On failure — returns 401 immediately, request never reaches downstream service

Downstream services read `req.headers['x-user-id']` instead of verifying JWT themselves.

---

## Public Routes (no token needed)

```
POST /api/auth/register
POST /api/auth/login
GET  /health
```

---

## Health Check

```bash
curl http://localhost:3000/health
```

Response:
```json
{ "service": "api-gateway", "status": "ok" }
```

---

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per IP
- Response on limit exceeded: `429 Too Many Requests`

---

## Common Issues

| Error | Cause | Fix |
|---|---|---|
| `503 Auth Service unavailable` | Auth Service not running | Start auth-service first |
| Requests hanging | Body parsing at gateway level | Do not add express.json() in gateway |
| `Route not found on gateway` | Wrong URL prefix | All routes must start with /api/ |
