# Payment Service

Handles Razorpay payment integration — creating payment orders, verifying signatures, and processing refunds. Publishes payment events to Kafka for Order Service to consume.

---

## Port

```
3004
```

---

## Structure

```
payment-service/
├── src/
│   ├── config/
│   │   ├── db.js               ← Neon PostgreSQL pool
│   │   ├── kafka.js            ← Aiven Kafka client
│   │   └── razorpay.js         ← Razorpay client
│   ├── models/
│   │   └── payment.model.js    ← payments table queries
│   ├── controllers/
│   │   └── payment.controller.js ← initiate, verify, refund, getByOrderId
│   ├── middleware/
│   │   └── auth.middleware.js  ← reads x-user-* headers from gateway
│   ├── kafka/
│   │   └── producer.js         ← publishes payment.success, payment.failed, order.notification
│   ├── routes/
│   │   └── payment.routes.js
│   └── app.js
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
PORT=3004
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/payment_db?sslmode=require
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
KAFKA_BROKER=kafka-xxx.aivencloud.com:24405
KAFKA_SSL_CA=../certs/ca.pem
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=your_aiven_password
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | Web server |
| pg | ^8.11.3 | PostgreSQL client |
| kafkajs | ^2.2.4 | Kafka producer |
| razorpay | ^2.9.2 | Razorpay Node.js SDK |
| dotenv | ^16.3.1 | Environment variables |

---

## Installation

```bash
npm install
```

---

## Database Setup

Create `payment_db` in Neon. The `payments` table is created automatically on first start:

```sql
CREATE TABLE IF NOT EXISTS payments (
  id                  SERIAL PRIMARY KEY,
  order_id            INTEGER NOT NULL,
  user_id             INTEGER NOT NULL,
  razorpay_order_id   VARCHAR(100) UNIQUE NOT NULL,
  razorpay_payment_id VARCHAR(100),
  razorpay_signature  VARCHAR(255),
  amount              NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(10) DEFAULT 'INR',
  status              VARCHAR(20) NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created','paid','failed','refunded')),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
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
Payment Service connected to Neon PostgreSQL
Payments table ready
Payment Service running on http://localhost:3004
```

---

## API Endpoints

All routes prefixed with `/payments`. Access via gateway at `/api/payments/*`. All require Bearer token.

---

### POST /payments/initiate
Creates a Razorpay order. Call this after creating an order via Order Service.

**Body:**
```json
{
  "orderId": 1,
  "amount": 999.99
}
```

**Response 201:**
```json
{
  "message": "Payment initiated",
  "razorpayOrderId": "order_PqXxxxxxxxxxxx",
  "razorpayKeyId": "rzp_test_xxxxxxxx",
  "amount": 99999,
  "currency": "INR",
  "orderId": 1
}
```

Use `razorpayOrderId` and `razorpayKeyId` to open Razorpay checkout on the frontend.

---

### POST /payments/verify
Verify payment after Razorpay checkout completes. Validates the HMAC SHA256 signature.

**Body:**
```json
{
  "razorpay_order_id": "order_PqXxxxxxxxxxxx",
  "razorpay_payment_id": "pay_PqXxxxxxxxxxxx",
  "razorpay_signature": "abc123...",
  "orderId": 1
}
```

**On success:**
- Payment marked as `paid` in DB
- Publishes `payment.success` to Kafka
- Order Service consumes it → updates order to `confirmed` → reduces stock

**On failure:**
- Payment marked as `failed` in DB
- Publishes `payment.failed` to Kafka
- Order Service consumes it → updates order to `cancelled`
- Sends PAYMENT_FAILED email

**Response 200:**
```json
{
  "message": "Payment verified successfully",
  "payment": { "id": 1, "status": "paid", "amount": "999.99" }
}
```

---

### POST /payments/refund/:orderId
Initiate a full refund for a paid order. Called automatically by Order Service when an order is cancelled.

**Response 200:**
```json
{
  "message": "Refund of ₹999.99 initiated successfully"
}
```

---

### GET /payments/order/:orderId
Get payment record for a specific order.

**Response 200:**
```json
{
  "payment": {
    "id": 1,
    "order_id": 1,
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "amount": "999.99",
    "status": "paid"
  }
}
```

---

## Kafka Events Published

| Topic | When |
|---|---|
| `payment.success` | Signature verified successfully |
| `payment.failed` | Signature verification fails |
| `order.notification` | Payment failed — triggers PAYMENT_FAILED email |

---

## Payment Flow (Full)

```
1. POST /api/orders              → order created (pending_payment)
2. POST /api/payments/initiate   → Razorpay order created, returns razorpayOrderId
3. Frontend opens Razorpay checkout with razorpayOrderId + razorpayKeyId
4. User pays → Razorpay returns: razorpay_order_id, razorpay_payment_id, razorpay_signature
5. POST /api/payments/verify     → signature verified
6. Kafka: payment.success published
7. Order Service: order → confirmed
8. Kafka: order.created published
9. Product Service: stock reduced
10. Email: ORDER_CONFIRMED sent
```

---

## Testing With Razorpay Test Mode

Use these test card details in Razorpay checkout:
- Card number: `4111 1111 1111 1111`
- Expiry: any future date
- CVV: any 3 digits
- OTP: `1234` (when prompted)

For UPI test: use `success@razorpay`

---

## Health Check

```bash
curl http://localhost:3004/health
```
