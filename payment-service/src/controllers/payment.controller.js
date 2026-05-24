const crypto   = require('crypto');
const razorpay = require('../config/razorpay');
const PaymentModel = require('../models/payment.model');
const {
  publishPaymentSuccess,
  publishPaymentFailed,
  publishOrderNotification,
} = require('../kafka/producer');

const PaymentController = {
  // Step 1 — Client calls this after placing order
  // Creates a Razorpay order and returns details for frontend checkout
  async initiate(req, res) {
    try {
      const { orderId, amount } = req.body;
      const { userId, email }   = req.user;

      if (!orderId || !amount) {
        return res.status(400).json({ message: 'orderId and amount are required' });
      }

      // Check if payment already exists for this order
      const existing = await PaymentModel.findByOrderId(orderId);
      if (existing && existing.status === 'paid') {
        return res.status(400).json({ message: 'Payment already completed for this order' });
      }

      // Amount in paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(parseFloat(amount) * 100);

      const razorpayOrder = await razorpay.orders.create({
        amount:   amountInPaise,
        currency: 'INR',
        receipt:  `order_${orderId}_${Date.now()}`,
        notes:    { orderId: String(orderId), userId: String(userId) },
      });

      // Save payment record in DB
      const payment = await PaymentModel.create({
        orderId,
        userId,
        razorpayOrderId: razorpayOrder.id,
        amount,
        currency: 'INR',
      });

      return res.status(201).json({
        message:          'Payment initiated',
        razorpayOrderId:  razorpayOrder.id,
        razorpayKeyId:    process.env.RAZORPAY_KEY_ID,
        amount:           amountInPaise,
        currency:         'INR',
        orderId,
        payment,
      });
    } catch (err) {
      console.error('initiate error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Step 2 — Client calls this after Razorpay checkout succeeds
  // Verifies the signature and publishes payment.success
  async verify(req, res) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
        return res.status(400).json({ message: 'razorpay_order_id, razorpay_payment_id, razorpay_signature and orderId are required' });
      }

      // Verify signature — HMAC SHA256
      const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected  = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expected !== razorpay_signature) {
        // Signature mismatch — mark payment as failed
        await PaymentModel.markFailed(razorpay_order_id);
        await publishPaymentFailed({
          orderId,
          userId:    req.user.userId,
          userEmail: req.user.email,
          reason:    'Payment signature verification failed',
        });
        await publishOrderNotification({
          orderId,
          userId:    req.user.userId,
          userEmail: req.user.email,
          type:      'PAYMENT_FAILED',
          message:   `Payment for order #${orderId} could not be verified`,
        });
        return res.status(400).json({ message: 'Payment verification failed — invalid signature' });
      }

      // Signature valid — mark payment as paid
      const payment = await PaymentModel.markPaid({
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });

      // Publish success — Order Service will confirm order and trigger stock reduction
      await publishPaymentSuccess({
        orderId,
        userId:           req.user.userId,
        userEmail:        req.user.email,
        amount:           payment.amount,
        razorpayPaymentId: razorpay_payment_id,
      });

      return res.status(200).json({
        message: 'Payment verified successfully',
        payment,
      });
    } catch (err) {
      console.error('verify error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // Called when order is cancelled — triggers Razorpay refund
  async refund(req, res) {
    try {
      const { orderId } = req.params;

      const payment = await PaymentModel.findByOrderId(orderId);
      if (!payment) {
        return res.status(404).json({ message: 'No payment found for this order' });
      }

      if (payment.status !== 'paid') {
        return res.status(400).json({ message: `Cannot refund — payment status is '${payment.status}'` });
      }

      // Issue refund via Razorpay
      const amountInPaise = Math.round(parseFloat(payment.amount) * 100);
      await razorpay.payments.refund(payment.razorpay_payment_id, {
        amount: amountInPaise,
        notes:  { reason: 'Order cancelled', orderId: String(orderId) },
      });

      await PaymentModel.markRefunded(orderId);

      await publishOrderNotification({
        orderId,
        userId:    payment.user_id,
        userEmail: req.user.email,
        type:      'ORDER_CANCELLED',
        message:   `Your order #${orderId} has been cancelled and refund of ₹${payment.amount} has been initiated`,
      });

      return res.status(200).json({
        message: `Refund of ₹${payment.amount} initiated successfully`,
        payment,
      });
    } catch (err) {
      console.error('refund error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getByOrderId(req, res) {
    try {
      const payment = await PaymentModel.findByOrderId(req.params.orderId);
      if (!payment) {
        return res.status(404).json({ message: 'No payment found for this order' });
      }
      return res.status(200).json({ payment });
    } catch (err) {
      console.error('getByOrderId error:', err.message);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = PaymentController;
