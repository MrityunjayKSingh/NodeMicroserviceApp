# Order Service

Manages the full order lifecycle. Creates orders, listens to payment and stock events via Kafka, and coordinates status transitions.

---

## Port

```
3003
```

---

## Structure

```
order-service/
├── src/
│   ├── config/
│   │   ├── db.js               ← Neon PostgreSQL pool
│   │   └── kafka.js            ← Aiven Kafka client
│   ├── models/
│   │   └── order.model.js      ← orders + order_items table queries
│   ├── controllers/
│   │   └── order.controller.js ← create, getAll, getById, getMyOrders, updateStatus, cancel
│   ├── middleware/
│   │   └── auth.middleware.js  ← reads x-user-* headers from gateway
│   ├── kafka/
│   │   ├── producer.js         ← publishes order.created, order.notification
│   │   └── consumer.js         ← consumes payment.success, payment.failed, stock.updated
│   ├── routes/
│   │   └── order.routes.js
│   └── app.js
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
PORT=3003
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/order_db?sslmode=require
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
| kafkajs | ^2.2.4 | Kafka producer and consumer |
| axios | latest | HTTP call to Payment Service for refunds |
| dotenv | ^16.3.1 | Environment variables |

---

## Installation

```bash
npm install
```

---

## Database Setup

Create `order_db` in Neon. Tables are created automatically on first start:

```sql
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  user_email   VARCHAR(150),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
               CHECK (status IN ('pending_payment','confirmed','processing','shipped','delivered','cancelled')),
  total_amount NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  quantity   INTEGER NOT NULL,
  price      NUMERIC(10,2) NOT NULL
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
Order Service connected to Neon PostgreSQL
Orders and order_items tables ready
Order Service Kafka consumer listening on: stock.updated, payment.success, payment.failed
Order Service running on http://localhost:3003
```

---

## API Endpoints

All routes prefixed with `/orders`. Access via gateway at `/api/orders/*`. All require Bearer token.

### POST /orders
Place a new order. Status starts as `pending_payment`. No stock is reduced yet — that happens after payment.

**Body:**
```json
{
  "items": [
    { "productId": 1, "quantity": 2, "price": 999.99 },
    { "productId": 3, "quantity": 1, "price": 49.99  }
  ]
}
```

**Response 201:**
```json
{
  "message": "Order created. Proceed to payment.",
  "order": { "id": 1, "status": "pending_payment", "total_amount": "2049.97" },
  "nextStep": "POST /api/payments/initiate with { orderId: 1, amount: 2049.97 }"
}
```

---

### GET /orders
Get all orders. **Admin only.**

---

### GET /orders/mine
Get orders placed by the logged-in user.

---

### GET /orders/:id
Get a single order with all items. Owner or admin only.

**Response 200:**
```json
{
  "order": {
    "id": 1,
    "status": "confirmed",
    "total_amount": "999.99",
    "items": [
      { "productId": 1, "quantity": 1, "price": "999.99" }
    ]
  }
}
```

---

### PATCH /orders/:id/status
Update order status. **Admin only.**

**Body:**
```json
{ "status": "processing" }
```

Valid transitions:
```
pending_payment → cancelled
confirmed       → processing, cancelled
processing      → shipped, cancelled
shipped         → delivered
delivered       → (no transitions)
cancelled       → (no transitions)
```

---

### DELETE /orders/:id
Cancel an order. Owner or admin only.

- If order was `confirmed` or `processing` — automatically calls Payment Service to initiate refund
- Publishes `ORDER_CANCELLED` notification
- Cannot cancel if `shipped` or `delivered`

---

## Kafka Events

### Consumes
| Topic | Action |
|---|---|
| `payment.success` | Updates order to `confirmed`, publishes `order.created` to trigger stock reduction |
| `payment.failed` | Updates order to `cancelled` |
| `stock.updated` | Logs stock confirmation |

### Publishes
| Topic | When |
|---|---|
| `order.created` | After payment.success — triggers Product Service to reduce stock |
| `order.notification` | On status changes (shipped, delivered, cancelled) |

---

## Health Check

```bash
curl http://localhost:3003/health
```

---

## Status Change Emails

When admin updates status via `PATCH /orders/:id/status`:
- `shipped` → sends ORDER_SHIPPED email
- `delivered` → sends ORDER_DELIVERED email
- `cancelled` → sends ORDER_CANCELLED email
