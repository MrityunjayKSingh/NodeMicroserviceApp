require('dotenv').config();
const express        = require('express');
const productRoutes  = require('./routes/product.routes');
const ProductModel   = require('./models/product.model');
const { startConsumer } = require('./kafka/consumer');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/products', productRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'product-service', status: 'ok' });
});

// Multer error handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3002;



  const start = async () => {
  try {
    await ProductModel.createTable();
    await startConsumer();          // ← this line must be there
    app.listen(PORT,'0.0.0.0', () => {
      console.log(`Product Service running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Product Service:', err.message);
    process.exit(1);
  }
};

start();
