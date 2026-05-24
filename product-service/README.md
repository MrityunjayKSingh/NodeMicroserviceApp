# Product Service

Handles product CRUD operations, image uploads to Cloudinary, and stock management via Kafka events.

---

## Port

```
3002
```

---

## Structure

```
product-service/
├── src/
│   ├── config/
│   │   ├── db.js               ← Neon PostgreSQL pool
│   │   ├── kafka.js            ← Aiven Kafka client (SASL + TLS)
│   │   └── cloudinary.js       ← Cloudinary client
│   ├── models/
│   │   └── product.model.js    ← products table queries + reduceStock
│   ├── controllers/
│   │   └── product.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js   ← reads x-user-* headers from gateway
│   │   └── upload.middleware.js ← multer memory storage, 5MB limit
│   ├── kafka/
│   │   ├── producer.js         ← publishes stock.updated, order.notification
│   │   └── consumer.js         ← consumes order.created, reduces stock
│   ├── routes/
│   │   └── product.routes.js
│   └── app.js
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
PORT=3002
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/product_db?sslmode=require
KAFKA_BROKER=kafka-xxx.aivencloud.com:24405
KAFKA_SSL_CA=../certs/ca.pem
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=your_aiven_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| express | ^4.18.2 | Web server |
| pg | ^8.11.3 | PostgreSQL client |
| kafkajs | ^2.2.4 | Kafka producer and consumer |
| cloudinary | latest | Image upload and deletion |
| multer | latest | Multipart form-data parsing |
| dotenv | ^16.3.1 | Environment variables |

---

## Installation

```bash
npm install
```

---

## Database Setup

Create `product_db` in Neon. The `products` table is created automatically on first start:

```sql
CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  description      TEXT,
  price            NUMERIC(10, 2) NOT NULL,
  stock            INTEGER NOT NULL DEFAULT 0,
  image_url        VARCHAR(500),
  image_public_id  VARCHAR(255),
  created_by       INTEGER NOT NULL,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
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
Product Service connected to Neon PostgreSQL
Products table ready
Product Service Kafka producer connected
Product Service Kafka consumer listening on: order.created
Product Service running on http://localhost:3002
```

---

## API Endpoints

All routes prefixed with `/products`. Access via gateway at `/api/products/*`. All require Bearer token.

### GET /products
Get all products.

**Response 200:**
```json
{
  "products": [
    {
      "id": 1, "name": "Laptop", "price": "999.99", "stock": 10,
      "image_url": "https://res.cloudinary.com/...",
      "image_public_id": "products/abc123"
    }
  ]
}
```

---

### GET /products/mine
Get products created by the logged-in user.

---

### GET /products/:id
Get a single product by ID.

---

### POST /products
Create a new product. Use `multipart/form-data` — NOT JSON.

**Body (form-data):**
| Field | Type | Required |
|---|---|---|
| name | Text | Yes |
| price | Text | Yes |
| stock | Text | No (default 0) |
| description | Text | No |
| image | File | No |

**Response 201:**
```json
{
  "message": "Product created successfully",
  "product": { "id": 1, "name": "Laptop", "image_url": "https://...", "image_public_id": "products/abc" }
}
```

---

### PUT /products/:id
Update a product. Use `multipart/form-data`. Uploading a new image automatically deletes the old one from Cloudinary.

Only the product owner or admin can update.

---

### DELETE /products/:id
Delete a product. Also deletes the image from Cloudinary.

Only the product owner or admin can delete.

---

## Kafka Events

### Consumes
| Topic | Action |
|---|---|
| `order.created` | Checks stock for each item, reduces if sufficient, publishes result |

### Publishes
| Topic | When |
|---|---|
| `stock.updated` | After stock reduction attempt (success or failed) |
| `order.notification` | After stock result — triggers email notification |

---

## Image Upload

- Storage: Cloudinary (folder: `products/`)
- Max size: 5MB
- Allowed types: JPEG, PNG, WEBP, GIF
- `image_url` and `image_public_id` stored in DB
- Old image deleted from Cloudinary when product is updated or deleted

---

## Health Check

```bash
curl http://localhost:3002/health
```

---

## Postman Tips

For product create/update, set body type to `form-data` in Postman:
- Add text fields: `name`, `price`, `stock`, `description`
- Add file field: key = `image`, type = File
