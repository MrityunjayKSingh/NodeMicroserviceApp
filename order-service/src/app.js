require('dotenv').config();
const express      = require('express');
const orderRoutes  = require('./routes/order.routes');
const OrderModel   = require('./models/order.model');
const { startConsumer } = require('./kafka/consumer');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/orders', orderRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'order-service', status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3003;

const start = async () => {
  try {
    await OrderModel.createTables();
    await startConsumer();
    app.listen(PORT,'0.0.0.0', () => {
      console.log(`Order Service running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Order Service:', err.message);
    process.exit(1);
  }
};

start();
