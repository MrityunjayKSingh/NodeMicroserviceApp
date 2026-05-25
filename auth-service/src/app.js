require('dotenv').config();
const express    = require('express');
const authRoutes = require('./routes/auth.routes');
const UserModel  = require('./models/user.model');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

UserModel.createTable()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Auth Service running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize DB:', err.message);
    process.exit(1);
  });
