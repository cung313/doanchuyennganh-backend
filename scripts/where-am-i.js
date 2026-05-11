require('dotenv').config();
const { pool } = require('../src/db/pool');

(async () => {
  const r = await pool.query(`
    SELECT current_database() AS db,
           current_schema() AS schema,
           current_user AS usr
  `);
  console.log(r.rows[0]);
  process.exit(0);
})();
