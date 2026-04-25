'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/models');

const TABLES = [
  'kullanici_rol',
  'kullanicilar',
  'roller',
  'kategori_sezon',
  'kanal_komisyon_kademeleri',
  'fiyatlandirma_kurallari',
  'rakipler',
  'kanallar',
  'cinsiyetler',
  'beden',
  'sezonlar',
  'marka',
  'kategoriler',
];

async function ensureKomisyonTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS kanal_komisyon_kademeleri (
      komisyon_id INT AUTO_INCREMENT PRIMARY KEY,
      kanal_id INT NOT NULL,
      kategori_id INT NOT NULL,
      fiyat_alt_limit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      fiyat_ust_limit DECIMAL(10,2) NOT NULL DEFAULT 999999.00,
      komisyon_orani DECIMAL(5,4) NOT NULL,
      gecerlilik_baslangic TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      gecerlilik_bitis TIMESTAMP NULL,
      FOREIGN KEY (kanal_id) REFERENCES kanallar(kanal_id) ON DELETE CASCADE,
      FOREIGN KEY (kategori_id) REFERENCES kategoriler(kategori_id) ON DELETE CASCADE
    )
  `);
}

async function seed() {
  await sequelize.authenticate();

  await ensureKomisyonTable();

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const tableName of TABLES) {
    await sequelize.query(`TRUNCATE TABLE ${tableName}`);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  await sequelize.query(`
    INSERT INTO roller (rol_id, rol_adi, aciklama) VALUES
      (1, 'Admin', 'Tam yetki'),
      (2, 'Operasyon', 'Fiyat onay/ret'),
      (3, 'Analiz', 'Görüntüleme')
  `);

  const adminHash = await bcrypt.hash('Admin123!', 10);
  await sequelize.query(`
    INSERT INTO kullanicilar (kullanici_id, ad_soyad, eposta, sifre_hash, olusturma_tarihi) VALUES
      (1, 'System Admin', 'admin@sporthink.local', :hash, NOW())
  `, { replacements: { hash: adminHash } });

  await sequelize.query(`
    INSERT INTO kullanici_rol (kullanici_id, rol_id) VALUES
      (1, 1)
  `);

  await sequelize.query(`
    INSERT INTO kategoriler (kategori_id, kategori_adi, kar_beklentisi) VALUES
      (1, 'Spor Ayakkabı', 0.3500),
      (2, 'Spor Giyim',    0.3000),
      (3, 'Aksesuar',      0.4000),
      (4, 'Çanta & Sırt',  0.2800),
      (5, 'Outdoor',       0.3200)
  `);

  await sequelize.query(`
    INSERT INTO marka (marka_id, marka_adi) VALUES
      (1, 'Nike'),
      (2, 'Adidas'),
      (3, 'Puma'),
      (4, 'New Balance'),
      (5, 'Reebok')
  `);

  await sequelize.query(`
    INSERT INTO sezonlar (sezon_id, sezon_adi, baslangic_tarihi, bitis_tarihi) VALUES
      (1, 'İlkbahar-Yaz 2025', '2025-03-01', '2025-08-31'),
      (2, 'Sonbahar-Kış 2025', '2025-09-01', '2026-02-28'),
      (3, 'İlkbahar-Yaz 2026', '2026-03-01', '2026-08-31')
  `);

  await sequelize.query(`
    INSERT INTO beden (beden_id, beden_adi) VALUES
      (1,'XS'),(2,'S'),(3,'M'),(4,'L'),(5,'XL'),(6,'XXL'),
      (7,'36'),(8,'37'),(9,'38'),(10,'39'),(11,'40'),(12,'41'),(13,'42'),(14,'43'),(15,'44')
  `);

  await sequelize.query(`
    INSERT INTO cinsiyetler (cinsiyet_id, cinsiyet_adi) VALUES
      (1,'Kadın'),(2,'Erkek'),(3,'Çocuk'),(4,'Unisex')
  `);

  await sequelize.query(`
    INSERT INTO kanallar (kanal_id, kanal_adi, kanal_url, kanal_sahibi) VALUES
      (1, 'Sporthink Web', 'https://sporthink.com', 1),
      (2, 'Trendyol', 'https://trendyol.com', 0),
      (3, 'Hepsiburada', 'https://hepsiburada.com', 0)
  `);

  await sequelize.query(`
    INSERT INTO rakipler (rakip_id, rakip_adi, rakip_url) VALUES
      (1, 'SportFactory', 'https://sportfactory.com'),
      (2, 'Decathlon', 'https://decathlon.com.tr'),
      (3, 'Intersport', 'https://intersport.com.tr')
  `);

  await sequelize.query(`
    INSERT INTO kategori_sezon (kategori_sezon_id, kategori_id, sezon_id) VALUES
      (1,1,1),(2,1,2),(3,1,3),(4,2,1),(5,2,2),(6,2,3),(7,3,1),(8,3,2),(9,4,2),(10,5,1),(11,5,3)
  `);

  const commissionTiers = [];
  let komisyonId = 1;
  for (const kanalId of [2, 3]) {
    for (const kategoriId of [1, 2, 3, 4, 5]) {
      commissionTiers.push(
        `(${komisyonId++}, ${kanalId}, ${kategoriId}, 1526.00, 999999.00, 0.1300, '2025-01-01', NULL)`,
        `(${komisyonId++}, ${kanalId}, ${kategoriId}, 1406.00, 1525.99, 0.0990, '2025-01-01', NULL)`,
        `(${komisyonId++}, ${kanalId}, ${kategoriId}, 1250.88, 1405.99, 0.0700, '2025-01-01', NULL)`,
        `(${komisyonId++}, ${kanalId}, ${kategoriId}, 0.00, 1250.87, 0.0360, '2025-01-01', NULL)`
      );
    }
  }

  await sequelize.query(`
    INSERT INTO kanal_komisyon_kademeleri
      (komisyon_id, kanal_id, kategori_id, fiyat_alt_limit, fiyat_ust_limit, komisyon_orani, gecerlilik_baslangic, gecerlilik_bitis)
    VALUES ${commissionTiers.join(',')}
  `);

  const pricingRows = [];
  let kuralId = 1;
  for (const kanalId of [1, 2, 3]) {
    for (const kategoriId of [1, 2, 3, 4, 5]) {
      const isWeb = kanalId === 1;
      const aylikHedef = isWeb ? 1200000 : 900000;
      const haftalikHedef = Math.round(aylikHedef / 4.3);
      pricingRows.push(
        `(${kuralId++}, ${kanalId}, ${kategoriId}, 0.40, 0.12, 0.98, 0.05, ${aylikHedef}, ${haftalikHedef}, 1, '2025-01-01', NULL)`
      );
    }
  }

  await sequelize.query(`
    INSERT INTO fiyatlandirma_kurallari
      (kural_id, kanal_id, kategori_id, max_indirim, min_kar, rekabet_katsayisi, geri_gelinebilecek_yuzde, aylik_satis_hedefi, haftalik_satis_hedefi, aktiflik_durumu, gecerlilik_baslangic, gecerlilik_bitis)
    VALUES ${pricingRows.join(',')}
  `);

  console.log('Lookup tables seeded successfully.');
  console.log('Admin login: admin@sporthink.local / Admin123!');
  await sequelize.close();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  try { await sequelize.close(); } catch (_) {}
  process.exitCode = 1;
});