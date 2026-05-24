require('dotenv').config();
const express        = require('express');
const rateLimiter    = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/authMiddleware');
const { authServiceProxy, productServiceProxy, orderServiceProxy,paymentServiceProxy } = require('./routes/proxy');

const app = express();

app.use(rateLimiter);

// DO NOT add express.json() or express.urlencoded() here
// Parsing body at gateway level breaks multipart/form-data forwarding

app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

app.use('/api/auth',     authServiceProxy);
app.use('/api/products', authMiddleware, productServiceProxy);
app.use('/api/orders',   authMiddleware, orderServiceProxy);
app.use('/api/payments', authMiddleware, paymentServiceProxy);
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});