'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/models');

const ADMIN_EMAIL = 'admin@sporthink.local';
const ADMIN_PASSWORD = 'Admin123!';

async function run() {
  try {
    await sequelize.authenticate();

    await sequelize.query(`
      INSERT INTO roller (rol_id, rol_adi, aciklama) VALUES
        (1, 'Admin', 'Tam yetki'),
        (2, 'Operasyon', 'Fiyat onay/ret'),
        (3, 'Analiz', 'Görüntüleme')
      ON DUPLICATE KEY UPDATE
        rol_adi = VALUES(rol_adi),
        aciklama = VALUES(aciklama)
    `);

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await sequelize.query(`
      INSERT INTO kullanicilar (kullanici_id, ad_soyad, eposta, sifre_hash, olusturma_tarihi) VALUES
        (1, 'System Admin', :eposta, :hash, NOW())
      ON DUPLICATE KEY UPDATE
        ad_soyad = VALUES(ad_soyad),
        sifre_hash = VALUES(sifre_hash)
    `, {
      replacements: {
        eposta: ADMIN_EMAIL,
        hash,
      },
    });

    await sequelize.query(`
      INSERT INTO kullanici_rol (kullanici_id, rol_id)
      SELECT 1, 1
      WHERE NOT EXISTS (
        SELECT 1 FROM kullanici_rol WHERE kullanici_id = 1 AND rol_id = 1
      )
    `);

    console.log('Bootstrap account ready');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();