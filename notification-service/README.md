# Notification Service

A Kafka consumer service with no HTTP server. Listens to the `order.notification` topic and sends transactional emails via SendGrid. Swap the email provider by updating `email.service.js` only.

---

## Port

```
None — no HTTP server
```

---

## Structure

```
notification-service/
├── src/
│   ├── config/
│   │   └── kafka.js            ← Aiven Kafka client
│   ├── kafka/
│   │   └── consumer.js         ← consumes order.notification, triggers emails
│   ├── email.service.js        ← SendGrid email templates and sender
│   └── app.js                  ← starts Kafka consumer only
├── .env
├── .env.example
└── package.json
```

---

## Environment Variables

```env
KAFKA_BROKER=kafka-xxx.aivencloud.com:24405
KAFKA_SSL_CA=../certs/ca.pem
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=your_aiven_password
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=your_verified_sender@email.com
SENDGRID_FROM_NAME=MK Store
```

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| kafkajs | ^2.2.4 | Kafka consumer |
| @sendgrid/mail | ^8.1.0 | Email delivery |
| dotenv | ^16.3.1 | Environment variables |

---

## Installation

```bash
npm install
```

---

## Running

```bash
npm start       # production
npm run dev     # development with auto-reload
```

Expected output:
```
Starting Notification Service...
Notification Service Kafka consumer listening on: order.notification
Notification Service running — waiting for events
```

---

## Kafka Events Consumed

| Topic | Action |
|---|---|
| `order.notification` | Reads event type, picks email template, sends email via SendGrid |

---

## Email Templates

| Event Type | Subject | Trigger |
|---|---|---|
| `ORDER_CONFIRMED` | ✅ Order #X Confirmed | Payment verified, stock reduced |
| `ORDER_CANCELLED` | 🚫 Order #X Cancelled | Order cancelled (includes refund amount if applicable) |
| `ORDER_SHIPPED` | 🚚 Order #X Shipped | Admin updates status to shipped |
| `ORDER_DELIVERED` | 🎉 Order #X Delivered | Admin updates status to delivered |
| `PAYMENT_FAILED` | ❌ Payment Failed for Order #X | Razorpay signature verification fails |

---

## SendGrid Setup

1. Go to [sendgrid.com](https://sendgrid.com) and sign up free
2. Settings → API Keys → Create API Key (Full Access) → copy it
3. Settings → Sender Authentication → Single Sender Verification → verify your email
4. Add the API key and verified email to your `.env`

> **Important:** SendGrid will reject emails if the sender is not verified. Make sure to complete Sender Authentication before testing.

---

## Adding New Email Types

1. Add a new key to the `TEMPLATES` object in `email.service.js`:

```js
YOUR_NEW_EVENT: (data) => ({
  subject: `Your subject here`,
  html: `<p>Your HTML email body here</p>`,
}),
```

2. Add the event type to `EMAIL_EVENTS` set in `kafka/consumer.js`:

```js
const EMAIL_EVENTS = new Set([
  'ORDER_CONFIRMED',
  'ORDER_CANCELLED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'PAYMENT_FAILED',
  'YOUR_NEW_EVENT',  // add here
]);
```

3. Publish the event from any service to `order.notification` topic with this structure:

```json
{
  "orderId": 1,
  "userId": 5,
  "userEmail": "customer@email.com",
  "type": "YOUR_NEW_EVENT",
  "message": "Custom message here",
  "createdAt": "2026-05-21T10:00:00Z"
}
```

---

## Switching Email Provider

To replace SendGrid with Nodemailer or Resend, only update `email.service.js`. The Kafka consumer and all other files remain unchanged.

**Example — switch to Nodemailer:**

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async ({ to, type, data }) => {
  const template = TEMPLATES[type];
  const { subject, html } = template(data);
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
};
```

---

## Console Output on Event

When an order notification is received:

```
[CONSUMER] order.notification received — type: ORDER_CONFIRMED, orderId: 1
========== NOTIFICATION ==========
TO      : customer@example.com
TYPE    : ORDER_CONFIRMED
ORDER   : #1
MESSAGE : Your order #1 has been confirmed and is being processed
==================================
[EMAIL] Sent ORDER_CONFIRMED email to customer@example.com for orderId: 1
```
