const pool = require('./src/db/pool');

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();