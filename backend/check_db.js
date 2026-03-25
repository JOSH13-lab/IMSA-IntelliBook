const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'imsa_intellibook',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  try {
    console.log('--- Books Table Schema ---');
    const cols = await pool.query("SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'books'");
    console.table(cols.rows);

    console.log('\n--- Sample Books (first 5) ---');
    const books = await pool.query("SELECT id, title, is_active, is_available, available_copies, deleted_at FROM books LIMIT 5");
    console.table(books.rows);

    console.log('\n--- API-like Search Test ---');
    const searchRes = await pool.query("SELECT * FROM search_books(NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'pertinence', 1, 10)");
    console.log('Search returned:', searchRes.rows.length, 'books');
    if (searchRes.rows.length > 0) {
        console.log('First book from search:', searchRes.rows[0].title);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkSchema();
