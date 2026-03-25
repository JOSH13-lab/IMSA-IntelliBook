const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function getFunc() {
  try {
    const res = await pool.query(`
      SELECT pg_get_functiondef(p.oid) 
      FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' 
        AND p.proname = 'search_books'
    `);
    if (res.rows.length > 0) {
      console.log(res.rows[0].pg_get_functiondef);
    } else {
      console.log('Function NOT FOUND');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

getFunc();
