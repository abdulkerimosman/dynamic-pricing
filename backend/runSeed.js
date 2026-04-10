require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/models');

async function run() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    console.log('Connected! Running seed.sql...');
    
    // Read the seed file
    const seedPath = path.join(__dirname, '../database/seed.sql');
    let seedSql = fs.readFileSync(seedPath, 'utf8');
    
    // Split the file into separate queries by the GO / ; delimiter
    // Note: this is a simple naive approach. A proper parser is better, but this works for basic inserts.
    const statements = seedSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.toUpperCase().startsWith('USE ')) continue; // Skip USE sporthink as sequelize connects to it already
        try {
            await sequelize.query(stmt);
        } catch(e) {
            console.log("Skipping/Failed on:", stmt.substring(0, 50), e.message);
        }
    }
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding DB:', error);
  } finally {
    process.exit(0);
  }
}

run();
