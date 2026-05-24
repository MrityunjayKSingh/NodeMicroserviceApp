# Docker Setup — Local Development

Run all 6 services with a single command using Docker Compose.

---

## Prerequisites

- Docker Desktop installed and running
- `docker --version` works in terminal

---

## File Placement

Copy files from this zip to your project root:

```
microservices/
├── docker-compose.yml          ← root level
├── .env.example                ← root level (copy to .env)
├── .gitignore                  ← root level (replace existing)
├── api-gateway/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
│       ├── middleware/
│       │   └── authMiddleware.js   ← REPLACE existing
│       └── routes/
│           └── proxy.js            ← REPLACE existing
├── auth-service/
│   ├── Dockerfile
│   └── .dockerignore
├── product-service/
│   ├── Dockerfile
│   └── .dockerignore
├── order-service/
│   ├── Dockerfile
│   └── .dockerignore
├── payment-service/
│   ├── Dockerfile
│   └── .dockerignore
└── notification-service/
    ├── Dockerfile
    └── .dockerignore
```

Also update `order-service/src/controllers/order.controller.js` — replace the hardcoded `http://localhost:3004` in the `cancel()` method with:
```js
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
```

---

## Step 1 — Set Up Root .env

```bash
cp .env.example .env
```

Edit `.env` and fill in your actual values:
- Replace all 4 `DATABASE_URL` values with your Neon connection strings
- Fill in `KAFKA_PASSWORD` with your Aiven password
- All other values are already pre-filled

---

## Step 2 — Verify Certs Folder

Make sure your Aiven cert files are at:

```
microservices/certs/ca.pem
microservices/certs/service.key
microservices/certs/service.cert
```

These are mounted read-only into each container that needs Kafka.

---

## Step 3 — Build and Start All Services

```bash
# From microservices/ root folder
docker-compose up --build
```

First run takes 2-3 minutes to build all images.

To run in background:
```bash
docker-compose up --build -d
```

---

## Step 4 — Verify All Services Are Running

```bash
docker-compose ps
```

Expected output:
```
NAME                   STATUS          PORTS
api-gateway            Up (healthy)    0.0.0.0:3000->3000/tcp
auth-service           Up (healthy)    0.0.0.0:3001->3001/tcp
product-service        Up (healthy)    0.0.0.0:3002->3002/tcp
order-service          Up (healthy)    0.0.0.0:3003->3003/tcp
payment-service        Up (healthy)    0.0.0.0:3004->3004/tcp
notification-service   Up
```

Health checks:
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
```

---

## Useful Commands

```bash
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f api-gateway
docker-compose logs -f order-service

# Restart a single service
docker-compose restart product-service

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild a single service after code change
docker-compose up --build product-service

# Open shell inside a container
docker exec -it auth-service sh
```

---

## How Services Communicate Inside Docker

In Docker Compose, services talk to each other by **container name**, not `localhost`:

| From | To | URL |
|---|---|---|
| API Gateway | Auth Service | http://auth-service:3001 |
| API Gateway | Product Service | http://product-service:3002 |
| API Gateway | Order Service | http://order-service:3003 |
| API Gateway | Payment Service | http://payment-service:3004 |
| Order Service | Payment Service | http://payment-service:3004 |

All set via environment variables in `docker-compose.yml` — no code changes needed.

---

## Making Code Changes

After changing any source file, rebuild just that service:

```bash
docker-compose up --build auth-service
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module` | node_modules not in container | Run `docker-compose up --build` not just `up` |
| `ECONNREFUSED auth-service:3001` | Service not healthy yet | Wait for healthchecks to pass, check logs |
| `unable to read ca file` | Certs not mounted | Check certs/ folder has all 3 files |
| `Container exiting immediately` | .env missing or wrong | Check root .env has all values filled in |
| Port already in use | Another process on 3000-3004 | Stop local node services before docker-compose up |
