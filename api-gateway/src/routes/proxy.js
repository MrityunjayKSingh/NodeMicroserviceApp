const { createProxyMiddleware } = require('http-proxy-middleware');

const authServiceProxy = createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/auth' },
});

const productServiceProxy = createProxyMiddleware({
  target: 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: { '^/api/products': '/products' },
});

const orderServiceProxy = createProxyMiddleware({
  target: 'http://localhost:3003',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/orders' },
});

module.exports = { authServiceProxy, productServiceProxy, orderServiceProxy };