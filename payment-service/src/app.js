require('dotenv').config();
const express        = require('express');
const paymentRoutes  = require('./routes/payment.routes');
const PaymentModel   = require('./models/payment.model');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/payments', paymentRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'payment-service', status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3004;

PaymentModel.createTable()
  .then(() => {
    app.listen(PORT,'0.0.0.0', () => {
      console.log(`Payment Service running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start Payment Service:', err.message);
    process.exit(1);
  });
