const express   = require('express');
const router    = express.Router();
const auth      = require('../middleware/auth.middleware');
const PaymentController = require('../controllers/payment.controller');

router.post('/initiate',          auth, PaymentController.initiate);
router.post('/verify',            auth, PaymentController.verify);
router.post('/refund/:orderId',   auth, PaymentController.refund);
router.get('/order/:orderId',     auth, PaymentController.getByOrderId);

module.exports = router;
