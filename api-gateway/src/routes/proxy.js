const { createProxyMiddleware } = require('http-proxy-middleware');

const authServiceProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
});

const productServiceProxy = createProxyMiddleware({
  target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
});

const orderServiceProxy = createProxyMiddleware({
  target: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' },
});

const paymentServiceProxy = createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  changeOrigin: true,
  pathRewrite: { '^/api/payments': '/payments' },
});

module.exports = { authServiceProxy, productServiceProxy, orderServiceProxy, paymentServiceProxy };
