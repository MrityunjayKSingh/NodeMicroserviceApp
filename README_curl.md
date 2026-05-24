# Microservices — API Testing Guide

All requests go through the API Gateway on **port 3000** only.

---

## Base URL
```
http://localhost:3000
```

---

## Auth Service Routes (No token required)

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"secret123"}'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

---

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'
```

Expected response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "user" }
}
```

> Copy the token value — you need it for all product routes below.

---

### Get Profile (token required)
```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Product Service Routes (Token required for all)

> Replace `YOUR_TOKEN_HERE` with the token from login response.

### Create a Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Laptop","description":"A fast laptop","price":999.99,"stock":10}'
```

---

### Get All Products
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Get Single Product
```bash
curl http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Get My Products (created by logged-in user)
```bash
curl http://localhost:3000/api/products/mine \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Update a Product
```bash
curl -X PUT http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"price":899.99,"stock":8}'
```

---

### Delete a Product
```bash
curl -X DELETE http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Health Checks
```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## Postman Setup

1. Create a collection called **Microservices**
2. Add a collection variable `token` (leave value empty)
3. After login, copy the token and set it as the `token` variable
4. For all protected routes set Authorization to:
   - Type: **Bearer Token**
   - Token: `{{token}}`

---

## Important Notes

- Register and Login do **not** need a token
- All `/api/products/*` routes **require** a Bearer token
- Users can only update/delete their **own** products
- Admins can update/delete **any** product
- To make a user admin, run this SQL in Neon dashboard:
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
  ```
