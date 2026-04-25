'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/models');

async function run() {
  try {
    await sequelize.authenticate();

    const adminHash = await bcrypt.hash('Admin123!', 10);

    await sequelize.query(`
      INSERT INTO marka (marka_id, marka_adi) VALUES
        (1, 'Nike'),
        (2, 'Adidas'),
        (3, 'Puma')
    `);

    await sequelize.query(`
      INSERT INTO roller (rol_id, rol_adi, aciklama) VALUES
        (1, 'Admin', 'Tam yetki'),
        (2, 'Operasyon', 'Operasyon yetkisi'),
        (3, 'Analiz', 'Rapor ve analiz')
    `);

    await sequelize.query(`
      INSERT INTO kullanicilar (kullanici_id, ad_soyad, eposta, sifre_hash, olusturma_tarihi) VALUES
        (1, 'System Admin', 'admin@sporthink.local', :adminHash, NOW())
    `, { replacements: { adminHash } });

    await sequelize.query(`
      INSERT INTO kullanici_rol (kullanici_rol_id, kullanici_id, rol_id) VALUES
        (1, 1, 1)
    `);

    await sequelize.query(`
      INSERT INTO cinsiyetler (cinsiyet_id, cinsiyet_adi) VALUES
        (1, 'Kadın'),
        (2, 'Erkek')
    `);

    await sequelize.query(`
      INSERT INTO kategoriler (kategori_id, kategori_adi, kar_beklentisi) VALUES
        (1, 'Ayakkabi', 0.35),
        (2, 'Giyim', 0.30),
        (3, 'Aksesuar', 0.40)
    `);

    await sequelize.query(`
      INSERT INTO sezonlar (sezon_id, sezon_adi, baslangic_tarihi, bitis_tarihi) VALUES
        (1, 'Kış', '2026-12-01', '2027-02-28'),
        (2, 'İlkbahar', '2026-03-01', '2026-05-31'),
        (3, 'Yaz', '2026-06-01', '2026-08-31'),
        (4, 'Sonbahar', '2026-09-01', '2026-11-30')
    `);

    await sequelize.query(`
      INSERT INTO beden (beden_id, beden_adi) VALUES
        (1, 's'),
        (2, 'm'),
        (3, 'l'),
        (4, 'xl')
    `);

    await sequelize.query(`
      INSERT INTO kanallar (kanal_id, kanal_adi, kanal_url, kanal_aciklamasi, kanal_sahibi, olusturma_tarihi) VALUES
        (1, 'Sporthink Web', 'https://sporthink.com', 'Own website', 1, NOW()),
        (2, 'Trendyol', 'https://trendyol.com', 'Marketplace', 0, NOW()),
        (3, 'Hepsiburada', 'https://hepsiburada.com', 'Marketplace', 0, NOW())
    `);

    await sequelize.query(`
      INSERT INTO rakipler (rakip_id, rakip_adi, rakip_url) VALUES
        (1, 'SportFactory', 'https://sportfactory.com'),
        (2, 'Decathlon', 'https://decathlon.com'),
        (3, 'Intersport', 'https://intersport.com')
    `);

    await sequelize.query(`
      INSERT INTO kategori_sezon (kategori_sezon_id, kategori_id, sezon_id) VALUES
        (1, 1, 1),
        (2, 1, 2),
        (3, 1, 3),
        (4, 1, 4),
        (5, 2, 1),
        (6, 2, 2),
        (7, 2, 3),
        (8, 2, 4),
        (9, 3, 1),
        (10, 3, 2),
        (11, 3, 3),
        (12, 3, 4)
    `);

    console.log('Requested baseline tables populated successfully.');
    console.log('Admin login: admin@sporthink.local / Admin123!');
  } catch (error) {
    console.error('Baseline seed failed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
