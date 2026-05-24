const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const email  = req.headers['x-user-email'];
  const role   = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized — request must go through API Gateway' });
  }

  req.user = { userId, email, role };
  next();
};

module.exports = authMiddleware;
