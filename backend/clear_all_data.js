'use strict';

require('dotenv').config();
const { sequelize } = require('./src/models');

const TABLES = [
  'islem_log',
  'hata_log',
  'alertler',
  'fiyat_onerileri',
  'fiyat_gecmisi',
  'satislar',
  'rakip_fiyatlar',
  'stok',
  'kanal_urun',
  'kampanya_planlari',
  'kategori_sezon',
  'kanal_komisyon_kademeleri',
  'fiyatlandirma_kurallari',
  'urun_cinsiyet',
  'urunler',
  'rakipler',
  'sezonlar',
  'kanallar',
  'kategoriler',
  'marka',
  'beden',
  'cinsiyetler',
  'kullanici_rol',
  'roller',
  'kullanicilar',
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const tableName of TABLES) {
      await sequelize.query(`TRUNCATE TABLE ${tableName}`);
      console.log(`cleared ${tableName}`);
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('All application tables cleared.');
  } catch (error) {
    console.error('Database cleanup failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();