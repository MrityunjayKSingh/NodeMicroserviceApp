# MK Store — Node.js Microservices

A production-style e-commerce backend built with Node.js microservices architecture. Each service is independently deployable, communicates via REST (synchronous) or Apache Kafka (asynchronous), and uses Neon PostgreSQL as its database.

---

## Architecture Overview

```
                          ┌─────────────────────────────┐
                          │        Client / Postman      │
                          └────────────┬────────────────┘
                                       │ HTTP
                                       ▼
                          ┌─────────────────────────────┐
                          │       API Gateway (:3000)    │
                          │  Rate limiting · JWT verify  │
                          │  Request proxying            │
                          └──┬──────┬──────┬──────┬─────┘
                             │      │      │      │
               ┌─────────────┘      │      │      └──────────────┐
               │                    │      │                     │
               ▼                    ▼      ▼                     ▼
        Auth Service        Product Svc  Order Svc        Payment Svc
          (:3001)            (:3002)     (:3003)            (:3004)
        Neon auth_db       Neon prod_db Neon order_db    Neon payment_db
                                │           │                    │
                                │           │                    │
                                └─────┬─────┘────────────────────┘
                                      │ Apache Kafka (Aiven)
                          ┌───────────┴────────────────┐
                          │      Kafka Topics           │
                          │  order.created             │
                          │  stock.updated             │
                          │  payment.success           │
                          │  payment.failed            │
                          │  order.notification        │
                          └───────────┬────────────────┘
                                      │
                                      ▼
                          ┌─────────────────────────────┐
                          │    Notification Service      │
                          │  Kafka consumer only         │
                          │  SendGrid email delivery     │
                          └─────────────────────────────┘
```

---

## Services

| Service | Port | Language | Database | Description |
|---|---|---|---|---|
| API Gateway | 3000 | Node.js | — | Single entry point, rate limiting, auth proxy |
| Auth Service | 3001 | Node.js | Neon auth_db | Register, login, JWT verification |
| Product Service | 3002 | Node.js | Neon product_db | Product CRUD, image upload, stock management |
| Order Service | 3003 | Node.js | Neon order_db | Order lifecycle management |
| Payment Service | 3004 | Node.js | Neon payment_db | Razorpay integration, refunds |
| Notification Service | — | Node.js | — | Email notifications via SendGrid |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v18 LTS |
| Framework | Express.js |
| Database | Neon (Serverless PostgreSQL) |
| Message Broker | Apache Kafka (Aiven) |
| Auth | JWT + bcryptjs |
| Image Storage | Cloudinary |
| Payment | Razorpay |
| Email | SendGrid |
| API Gateway | http-proxy-middleware v2 |

---

## Project Structure

```
microservices/
├── certs/                        ← Aiven Kafka TLS certificates
│   ├── ca.pem
│   ├── service.key
│   └── service.cert
├── api-gateway/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── rateLimiter.js
│   │   ├── routes/
│   │   │   └── proxy.js
│   │   └── app.js
│   ├── .env
│   └── package.json
├── auth-service/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/user.model.js
│   │   ├── controllers/auth.controller.js
│   │   ├── routes/auth.routes.js
│   │   └── app.js
│   ├── .env
│   └── package.json
├── product-service/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   ├── kafka.js
│   │   │   └── cloudinary.js
│   │   ├── models/product.model.js
│   │   ├── controllers/product.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── upload.middleware.js
│   │   ├── kafka/
│   │   │   ├── producer.js
│   │   │   └── consumer.js
│   │   ├── routes/product.routes.js
│   │   └── app.js
│   ├── .env
│   └── package.json
├── order-service/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── kafka.js
│   │   ├── models/order.model.js
│   │   ├── controllers/order.controller.js
│   │   ├── middleware/auth.middleware.js
│   │   ├── kafka/
│   │   │   ├── producer.js
│   │   │   └── consumer.js
│   │   ├── routes/order.routes.js
│   │   └── app.js
│   ├── .env
│   └── package.json
├── payment-service/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   ├── kafka.js
│   │   │   └── razorpay.js
│   │   ├── models/payment.model.js
│   │   ├── controllers/payment.controller.js
│   │   ├── middleware/auth.middleware.js
│   │   ├── kafka/producer.js
│   │   ├── routes/payment.routes.js
│   │   └── app.js
│   ├── .env
│   └── package.json
└── notification-service/
    ├── src/
    │   ├── config/kafka.js
    │   ├── kafka/consumer.js
    │   ├── email.service.js
    │   └── app.js
    ├── .env
    └── package.json
```

---

## Prerequisites

- Node.js v18 LTS — [nodejs.org](https://nodejs.org)
- Neon account — [neon.tech](https://neon.tech)
- Aiven account — [aiven.io](https://aiven.io)
- Cloudinary account — [cloudinary.com](https://cloudinary.com)
- Razorpay account — [razorpay.com](https://razorpay.com)
- SendGrid account — [sendgrid.com](https://sendgrid.com)

---

## External Services Setup

### 1. Neon PostgreSQL — Create 4 databases
Go to your Neon project → Databases tab → create:
- `auth_db`
- `product_db`
- `order_db`
- `payment_db`

Copy the connection string for each from the Connection Details panel.

### 2. Aiven Kafka — Create cluster and topics
Create a Kafka cluster, then create these 5 topics:
- `order.created`
- `stock.updated`
- `payment.success`
- `payment.failed`
- `order.notification`

Download the 3 cert files (`ca.pem`, `service.key`, `service.cert`) and place in `microservices/certs/`.

### 3. Cloudinary
Sign up → Dashboard → copy Cloud Name, API Key, API Secret.

### 4. Razorpay
Sign up → Settings → API Keys → Generate Test Key → copy Key ID and Key Secret.

### 5. SendGrid
Sign up → Settings → API Keys → Create API Key.
Settings → Sender Authentication → verify your sender email.

---

## Installation

Run `npm install` in each service folder:

```bash
cd auth-service        && npm install && cd ..
cd product-service     && npm install && cd ..
cd order-service       && npm install && cd ..
cd payment-service     && npm install && cd ..
cd notification-service && npm install && cd ..
cd api-gateway         && npm install && cd ..
```

---

## Environment Setup

Copy `.env.example` to `.env` in each service and fill in your credentials.
See each service's own README for the exact variables required.

---

## Running All Services

Start each in a separate terminal in this order:

```bash
# Terminal 1
cd auth-service && npm start

# Terminal 2
cd product-service && npm start

# Terminal 3
cd order-service && npm start

# Terminal 4
cd payment-service && npm start

# Terminal 5
cd notification-service && npm start

# Terminal 6
cd api-gateway && npm start
```

---

## Kafka Event Flow

```
1. Client → POST /api/orders
   Order Service creates order (status: pending_payment)

2. Client → POST /api/payments/initiate
   Payment Service creates Razorpay order → returns razorpay_order_id

3. Client → POST /api/payments/verify  (after Razorpay checkout)
   Payment Service verifies signature
   → publishes: payment.success

4. Order Service consumes payment.success
   → updates order: pending_payment → confirmed
   → publishes: order.created

5. Product Service consumes order.created
   → reduces stock for each item
   → publishes: stock.updated
   → publishes: order.notification (ORDER_CONFIRMED)

6. Order Service consumes stock.updated
   → logs stock update confirmation

7. Notification Service consumes order.notification
   → sends ORDER_CONFIRMED email via SendGrid
```

---

## Complete API Reference

### Auth Routes — No token required

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | /api/auth/register | name, email, password | Register new user |
| POST | /api/auth/login | email, password | Login, returns JWT |
| GET | /api/auth/profile | — | Get logged-in user profile |

### Product Routes — Bearer token required

| Method | Endpoint | Body / Params | Description |
|---|---|---|---|
| GET | /api/products | — | Get all products |
| GET | /api/products/mine | — | Get my products |
| GET | /api/products/:id | — | Get product by ID |
| POST | /api/products | multipart/form-data | Create product with optional image |
| PUT | /api/products/:id | multipart/form-data | Update product |
| DELETE | /api/products/:id | — | Delete product |

### Order Routes — Bearer token required

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | /api/orders | items[] | Place order (status: pending_payment) |
| GET | /api/orders | — | All orders (admin only) |
| GET | /api/orders/mine | — | My orders |
| GET | /api/orders/:id | — | Single order with items |
| PATCH | /api/orders/:id/status | status | Update status (admin only) |
| DELETE | /api/orders/:id | — | Cancel order (triggers refund) |

### Payment Routes — Bearer token required

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | /api/payments/initiate | orderId, amount | Create Razorpay order |
| POST | /api/payments/verify | razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId | Verify payment |
| POST | /api/payments/refund/:orderId | — | Refund payment |
| GET | /api/payments/order/:orderId | — | Get payment by order |

---

## Order Status Transitions

```
pending_payment → confirmed (after payment.success)
confirmed       → processing, cancelled
processing      → shipped, cancelled
shipped         → delivered
delivered       → (final state)
cancelled       → (final state, refund triggered if was confirmed)
```

---

## Email Notifications

Emails are sent automatically for:

| Event | Trigger |
|---|---|
| ORDER_CONFIRMED | Payment verified successfully |
| ORDER_CANCELLED | Order cancelled (includes refund amount if applicable) |
| ORDER_SHIPPED | Admin updates status to shipped |
| ORDER_DELIVERED | Admin updates status to delivered |
| PAYMENT_FAILED | Payment signature verification fails |

---

## End-to-End Test Flow

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'

# 2. Login — copy the token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'

# 3. Create a product (form-data in Postman — set body to multipart/form-data)
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Laptop" -F "price=999.99" -F "stock=10" \
  -F "description=Fast laptop" -F "image=@/path/to/image.jpg"

# 4. Place an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"items":[{"productId":1,"quantity":1,"price":999.99}]}'

# 5. Initiate payment — copy razorpayOrderId
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"orderId":1,"amount":999.99}'

# 6. Verify payment (use Razorpay test credentials)
curl -X POST http://localhost:3000/api/payments/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"razorpay_order_id":"order_xxx","razorpay_payment_id":"pay_xxx","razorpay_signature":"xxx","orderId":1}'

# 7. Check order status (should be confirmed)
curl http://localhost:3000/api/orders/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Health Checks

```bash
curl http://localhost:3000/health   # API Gateway
curl http://localhost:3001/health   # Auth Service
curl http://localhost:3002/health   # Product Service
curl http://localhost:3003/health   # Order Service
curl http://localhost:3004/health   # Payment Service
```

---

## Make a User Admin

In Neon SQL Editor (auth_db):
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `unable to read ca file` | Cert path wrong | Ensure certs/ folder has ca.pem, service.key, service.cert |
| `ECONNREFUSED` | Service not running | Start all services before gateway |
| `name and price are required` | Body not parsed | Use multipart/form-data in Postman for product routes |
| `check constraint violated` | Old DB rows incompatible | Run the SQL migration in Neon dashboard |
| `String or address expected for from` | SendGrid env vars missing | Add SENDGRID_* vars to notification-service .env |
| `Payment verification failed` | Wrong signature | Use correct Razorpay test credentials |
