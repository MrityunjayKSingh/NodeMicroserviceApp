const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ message: 'name, email and password are required' });
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const user = await UserModel.create({ name, email, password, role });

      return res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (err) {
      console.error('Register error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'email and password are required' });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const isMatch = await UserModel.comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const payload = {
        userId: user.id,
        email:  user.email,
        role:   user.role,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      });

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        },
      });
    } catch (err) {
      console.error('Login error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async verify(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      return res.status(200).json({
        user: {
          userId: user.id,
          email:  user.email,
          role:   user.role,
          name:   user.name,
        },
      });
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
      console.error('Verify error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getProfile(req, res) {
    try {
      const userId = req.headers['x-user-id'];
      const user = await UserModel.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({ user });
    } catch (err) {
      console.error('Profile error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = AuthController;
