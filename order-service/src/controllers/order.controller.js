const axios    = require('axios');
const OrderModel = require('../models/order.model');
const { publishOrderCreated, publishOrderNotification } = require('../kafka/producer');

const VALID_TRANSITIONS = {
  pending_payment: ['cancelled'],
  confirmed:       ['processing', 'cancelled'],
  processing:      ['shipped', 'cancelled'],
  shipped:         ['delivered'],
  delivered:       [],
  cancelled:       [],
};

const STATUS_NOTIFICATION_TYPE = {
  cancelled: 'ORDER_CANCELLED',
  shipped:   'ORDER_SHIPPED',
  delivered: 'ORDER_DELIVERED',
};
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';

const OrderController = {
  async create(req, res) {
    try {
      const { items } = req.body;
      const { userId, email } = req.user;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'items array is required and cannot be empty' });
      }

      for (const item of items) {
        if (!item.productId || !item.quantity || !item.price) {
          return res.status(400).json({ message: 'Each item must have productId, quantity and price' });
        }
      }

      const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

      const order = await OrderModel.create({
        userId,
        userEmail: email,
        items,
        totalAmount: totalAmount.toFixed(2),
      });

      return res.status(201).json({
        message: 'Order created. Proceed to payment.',
        order: { ...order, items },
        nextStep: `POST /api/payments/initiate with { orderId: ${order.id}, amount: ${totalAmount.toFixed(2)} }`,
      });
    } catch (err) {
      console.error('Create order error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getAll(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      const orders = await OrderModel.findAll();
      return res.status(200).json({ orders });
    } catch (err) {
      console.error('getAll error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getById(req, res) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      if (String(order.user_id) !== String(req.user.userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(200).json({ order });
    } catch (err) {
      console.error('getById error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getMyOrders(req, res) {
    try {
      const orders = await OrderModel.findByUserId(req.user.userId);
      return res.status(200).json({ orders });
    } catch (err) {
      console.error('getMyOrders error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async updateStatus(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'status is required' });

      const order = await OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const allowed = VALID_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`,
        });
      }

      const updated = await OrderModel.updateStatus(req.params.id, status);

      const notificationType = STATUS_NOTIFICATION_TYPE[status];
      if (notificationType && order.user_email) {
        await publishOrderNotification({
          orderId:   order.id,
          userId:    order.user_id,
          userEmail: order.user_email,
          type:      notificationType,
          message:   `Your order #${order.id} status updated to ${status}`,
        });
      }

      return res.status(200).json({ message: 'Order status updated', order: updated });
    } catch (err) {
      console.error('updateStatus error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async cancel(req, res) {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ message: 'Order not found' });

      if (String(order.user_id) !== String(req.user.userId) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const cancelled = await OrderModel.cancel(req.params.id);
      if (!cancelled) {
        return res.status(400).json({ message: 'Order cannot be cancelled — already shipped or delivered' });
      }

      // Trigger refund if order was confirmed (payment was made)
      if (order.status === 'confirmed' || order.status === 'processing') {
        try {
          await axios.post(
            `${PAYMENT_SERVICE_URL}/payments/refund/${order.id}`,
            {},
            {
              headers: {
                'x-user-id':    String(req.user.userId),
                'x-user-email': req.user.email,
                'x-user-role':  req.user.role,
              },
              timeout: 5000,
            }
          );
          console.log(`[ORDER] Refund triggered for order ${order.id}`);
        } catch (refundErr) {
          // Log but don't fail — order is already cancelled
          console.error(`[ORDER] Refund call failed for order ${order.id}:`, refundErr.message);
        }
      } else if (order.user_email) {
        await publishOrderNotification({
          orderId:   order.id,
          userId:    order.user_id,
          userEmail: order.user_email,
          type:      'ORDER_CANCELLED',
          message:   `Your order #${order.id} has been cancelled`,
        });
      }

      return res.status(200).json({ message: 'Order cancelled successfully', order: cancelled });
    } catch (err) {
      console.error('cancel error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = OrderController;
