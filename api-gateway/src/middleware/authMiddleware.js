const axios = require('axios');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing. Use: Bearer <token>' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.post(
      'http://localhost:3001/auth/verify',
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }
    );

    const { user } = response.data;
    req.headers['x-user-id']    = String(user.userId);
    req.headers['x-user-email'] = user.email;
    req.headers['x-user-role']  = user.role;
    req.headers['x-user-name']  = user.name || '';

    next();
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return res.status(503).json({ message: 'Auth Service is unavailable' });
    }
    console.error('Auth middleware error:', err.message);
    return res.status(500).json({ message: 'Internal gateway error' });
  }
};

module.exports = authMiddleware;