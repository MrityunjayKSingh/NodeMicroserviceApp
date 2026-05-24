const pool = require('../config/db');

const OrderModel = {
  async createTables() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL,
        user_email   VARCHAR(150),
        status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
        total_amount NUMERIC(10,2) NOT NULL,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id         SERIAL PRIMARY KEY,
        order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        quantity   INTEGER NOT NULL,
        price      NUMERIC(10,2) NOT NULL
      );
    `);

    console.log('Orders and order_items tables ready');
  },

  async create({ userId, userEmail, items, totalAmount }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `INSERT INTO orders (user_id, user_email, total_amount)
         VALUES ($1, $2, $3) RETURNING *`,
        [userId, userEmail, totalAmount]
      );
      const order = orderResult.rows[0];

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)`,
          [order.id, item.productId, item.quantity, item.price]
        );
      }

      await client.query('COMMIT');
      return order;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findAll() {
    const result = await pool.query(
      `SELECT o.*, json_agg(
         json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'quantity', oi.quantity,
           'price', oi.price
         )
       ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT o.*, json_agg(
         json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'quantity', oi.quantity,
           'price', oi.price
         )
       ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async findByUserId(userId) {
    const result = await pool.query(
      `SELECT o.*, json_agg(
         json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'quantity', oi.quantity,
           'price', oi.price
         )
       ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async updateStatus(id, status) {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  },

  async cancel(id) {
    const result = await pool.query(
      `UPDATE orders
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
         AND status NOT IN ('shipped', 'delivered')
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = OrderModel;
