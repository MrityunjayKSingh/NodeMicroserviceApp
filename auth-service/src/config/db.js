const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required by Neon
});

pool.on('connect', () => {
  console.log('Auth Service connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err.message);
  process.exit(1);
});

module.exports = pool;
