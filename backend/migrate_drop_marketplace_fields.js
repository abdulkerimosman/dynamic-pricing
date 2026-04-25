/**
 * Database Migration: Remove marketplace-specific fields from fiyatlandirma_kurallari
 * 
 * Removes:
 * - komisyon_orani
 * - lojistik_gideri
 * - kargo_ucreti
 * 
 * This changes the system from a marketplace-aware pricing engine to a website-only pricing engine.
 */

require('dotenv').config();
const { sequelize } = require('./src/models');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Drop the columns
    try {
      await sequelize.query(`ALTER TABLE fiyatlandirma_kurallari DROP COLUMN komisyon_orani`);
    } catch (e) {
      console.log('   (komisyon_orani already dropped or does not exist)');
    }
    
    try {
      await sequelize.query(`ALTER TABLE fiyatlandirma_kurallari DROP COLUMN lojistik_gideri`);
    } catch (e) {
      console.log('   (lojistik_gideri already dropped or does not exist)');
    }
    
    try {
      await sequelize.query(`ALTER TABLE fiyatlandirma_kurallari DROP COLUMN kargo_ucreti`);
    } catch (e) {
      console.log('   (kargo_ucreti already dropped or does not exist)');
    }

    console.log('✅ Successfully removed marketplace fields:');
    console.log('   - komisyon_orani');
    console.log('   - lojistik_gideri');
    console.log('   - kargo_ucreti');
    console.log('\nPricing engine is now website-only.');

    await sequelize.close();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exitCode = 1;
    try {
      await sequelize.close();
    } catch {}
  }
}

migrate();
