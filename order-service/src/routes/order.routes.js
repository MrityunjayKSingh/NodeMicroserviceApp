const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth.middleware');
const OrderCtrl  = require('../controllers/order.controller');

router.post('/',             auth, OrderCtrl.create);
router.get('/',              auth, OrderCtrl.getAll);
router.get('/mine',          auth, OrderCtrl.getMyOrders);
router.get('/:id',           auth, OrderCtrl.getById);
router.patch('/:id/status',  auth, OrderCtrl.updateStatus);
router.delete('/:id',        auth, OrderCtrl.cancel);

module.exports = router;
