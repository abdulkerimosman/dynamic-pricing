/**
 * Sporthink — Database Seeder
 * Runs schema.sql then seed.sql against MySQL
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires: npm install mysql2 dotenv (in project root)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const DB_CONFIG = {
  host    : process.env.DB_HOST     || 'localhost',
  port    : parseInt(process.env.DB_PORT || '3306'),
  user    : process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

async function runSqlFile(connection, filePath) {
  const label = path.basename(filePath);
  console.log(`\n▶ Running ${label}...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  await connection.query(sql);
  console.log(`✅ ${label} completed.`);
}

async function main() {
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('🔌 Connected to MySQL');

  try {
    await runSqlFile(connection, path.join(__dirname, '..', 'database', 'schema.sql'));
    await runSqlFile(connection, path.join(__dirname, '..', 'database', 'seed.sql'));
    console.log('\n🎉 Database seeded successfully!');
    console.log('   Database: sporthink');
    console.log('   You can now start the backend: cd backend && npm run dev');
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
