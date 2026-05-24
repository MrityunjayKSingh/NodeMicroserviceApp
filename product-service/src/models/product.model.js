const pool = require('../config/db');

const ProductModel = {
  async createTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id               SERIAL PRIMARY KEY,
        name             VARCHAR(150) NOT NULL,
        description      TEXT,
        price            NUMERIC(10, 2) NOT NULL,
        stock            INTEGER NOT NULL DEFAULT 0,
        image_url        VARCHAR(500),
        image_public_id  VARCHAR(255),
        created_by       INTEGER NOT NULL,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add columns if table already exists (for existing deployments)
    await pool.query(`
      ALTER TABLE products
        ADD COLUMN IF NOT EXISTS image_url       VARCHAR(500),
        ADD COLUMN IF NOT EXISTS image_public_id VARCHAR(255);
    `);

    console.log('Products table ready');
  },

  async findAll() {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findByCreatedBy(userId) {
    const result = await pool.query(
      'SELECT * FROM products WHERE created_by = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async create({ name, description, price, stock, created_by, image_url = null, image_public_id = null }) {
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock, created_by, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, description, price, stock, created_by, image_url, image_public_id]
    );
    return result.rows[0];
  },

  async update(id, { name, description, price, stock, image_url, image_public_id }) {
    const result = await pool.query(
      `UPDATE products
       SET name             = COALESCE($1, name),
           description      = COALESCE($2, description),
           price            = COALESCE($3, price),
           stock            = COALESCE($4, stock),
           image_url        = COALESCE($5, image_url),
           image_public_id  = COALESCE($6, image_public_id),
           updated_at       = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, price, stock, image_url, image_public_id, id]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  },

  async reduceStock(id, quantity) {
    const result = await pool.query(
      `UPDATE products
       SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2 AND stock >= $1
       RETURNING *`,
      [quantity, id]
    );
    return result.rows[0] || null;
  },
};

module.exports = ProductModel;
