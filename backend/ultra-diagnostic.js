#!/usr/bin/env node
/**
 * ULTRA DIAGNOSTIC - Check Everything Before Fix
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                    🔍 ULTRA DIAGNOSTIC                              ║
║                Check All Systems Before Fix                         ║
╚══════════════════════════════════════════════════════════════════════╝
`);

let passed = 0;
let failed = 0;

function check(title, condition, details = '') {
  if (condition) {
    console.log(`✅ ${title}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.log(`❌ ${title}`);
    if (details) console.log(`   ${details}`);
    failed++;
  }
}

// 1. Check .env
console.log('\n📋 ENVIRONMENT\n');
const envPath = path.join(__dirname, '.env');
check('✓ .env file exists', fs.existsSync(envPath), envPath);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  check('✓ DB_HOST configured', envContent.includes('DB_HOST'));
  check('✓ DB_USER configured', envContent.includes('DB_USER'));
  check('✓ DB_PASSWORD configured', envContent.includes('DB_PASSWORD'));
  check('✓ DB_NAME configured', envContent.includes('DB_NAME'));
}

// 2. Check Required Modules
console.log('\n📦 MODULES\n');
check('✓ pg module', tryRequire('pg'));
check('✓ dotenv module', tryRequire('dotenv'));
check('✓ express module', tryRequire('express'));

// 3. Check Database Connection
console.log('\n🗄️  DATABASE CONNECTION\n');
testDatabaseConnection();

// 4. Check Files
console.log('\n📁 CRITICAL FILES\n');
check('✓ all-in-one-fix.js', fs.existsSync(path.join(__dirname, 'all-in-one-fix.js')));
check('✓ controllers/books.controller.js', fs.existsSync(path.join(__dirname, 'controllers/books.controller.js')));
check('✓ package.json', fs.existsSync(path.join(__dirname, 'package.json')));

// 5. Check Frontend Files
console.log('\n🌐 FRONTEND FILES\n');
const frontendPath = path.join(__dirname, '..', 'js');
check('✓ js/main.js', fs.existsSync(path.join(frontendPath, 'main.js')));
check('✓ js/data.js', fs.existsSync(path.join(frontendPath, 'data.js')));
check('✓ js/carousel.js', fs.existsSync(path.join(frontendPath, 'carousel.js')));

// Summary
console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                        📊 SUMMARY                                   ║
╚══════════════════════════════════════════════════════════════════════╝

  ✅ Passed: ${passed}
  ❌ Failed: ${failed}

${failed === 0 ? `🎉 ALL SYSTEMS GO! 
   Ready to run: node all-in-one-fix.js` : `⚠️  Fix issues above before running fix`}

`);

function tryRequire(modName) {
  try {
    require(modName);
    return true;
  } catch (e) {
    return false;
  }
}

async function testDatabaseConnection() {
  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'imsa_intellibook',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    const { rows } = await pool.query('SELECT NOW()');
    check('✓ Can connect to PostgreSQL', true, `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

    const { rows: booksCount } = await pool.query('SELECT COUNT(*) FROM books WHERE is_active = TRUE');
    const total = parseInt(booksCount[0].count);
    check('✓ Books table accessible', total > 0, `${total} active books found`);

    const { rows: coversCount } = await pool.query('SELECT COUNT(cover_url) FROM books WHERE is_active = TRUE AND cover_url IS NOT NULL');
    const withCover = parseInt(coversCount[0].count);
    const percent = ((withCover / total) * 100).toFixed(1);
    check('✓ Books with cover URLs', withCover > 0, `${withCover}/${total} (${percent}%)`);

    if (withCover < total) {
      console.log(`\n   ⚠️  ${total - withCover} books need cover URLs`);
      console.log(`   → Run: node all-in-one-fix.js`);
    }

    await pool.end();
  } catch (err) {
    check('✓ PostgreSQL Connection', false, err.message);
  }
}
