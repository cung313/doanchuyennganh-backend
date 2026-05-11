require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        max: Number(process.env.PG_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
      }
    : {
        host: process.env.PG_HOST || 'localhost',
        port: Number(process.env.PG_PORT || 5432),
        user: process.env.PG_USER || 'postgres',
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE || 'samco_db',
        max: Number(process.env.PG_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
      }
);

pool.on('error', err => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

module.exports = pool;
module.exports.pool = pool;