const pool = require('../config/db');

const PaymentModel = {
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                  SERIAL PRIMARY KEY,
        order_id            INTEGER NOT NULL,
        user_id             INTEGER NOT NULL,
        razorpay_order_id   VARCHAR(100) UNIQUE NOT NULL,
        razorpay_payment_id VARCHAR(100),
        razorpay_signature  VARCHAR(255),
        amount              NUMERIC(10,2) NOT NULL,
        currency            VARCHAR(10) DEFAULT 'INR',
        status              VARCHAR(20) NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created','paid','failed','refunded')),
        created_at          TIMESTAMP DEFAULT NOW(),
        updated_at          TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Payments table ready');
  },

  async create({ orderId, userId, razorpayOrderId, amount, currency = 'INR' }) {
    const result = await pool.query(
      `INSERT INTO payments (order_id, user_id, razorpay_order_id, amount, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderId, userId, razorpayOrderId, amount, currency]
    );
    return result.rows[0];
  },

  async findByOrderId(orderId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    return result.rows[0] || null;
  },

  async findByRazorpayOrderId(razorpayOrderId) {
    const result = await pool.query(
      'SELECT * FROM payments WHERE razorpay_order_id = $1',
      [razorpayOrderId]
    );
    return result.rows[0] || null;
  },

  async markPaid({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const result = await pool.query(
      `UPDATE payments
       SET status              = 'paid',
           razorpay_payment_id = $1,
           razorpay_signature  = $2,
           updated_at          = NOW()
       WHERE razorpay_order_id = $3
       RETURNING *`,
      [razorpayPaymentId, razorpaySignature, razorpayOrderId]
    );
    return result.rows[0] || null;
  },

  async markFailed(razorpayOrderId) {
    const result = await pool.query(
      `UPDATE payments
       SET status     = 'failed',
           updated_at = NOW()
       WHERE razorpay_order_id = $1
       RETURNING *`,
      [razorpayOrderId]
    );
    return result.rows[0] || null;
  },

  async markRefunded(orderId) {
    const result = await pool.query(
      `UPDATE payments
       SET status     = 'refunded',
           updated_at = NOW()
       WHERE order_id = $1 AND status = 'paid'
       RETURNING *`,
      [orderId]
    );
    return result.rows[0] || null;
  },
};

module.exports = PaymentModel;
