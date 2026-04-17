'use strict';

require('dotenv').config();
const { sequelize } = require('./src/models');

async function run() {
  try {
    await sequelize.authenticate();

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS cinsiyetler (
        cinsiyet_id INT NOT NULL AUTO_INCREMENT,
        cinsiyet_adi VARCHAR(30) NOT NULL UNIQUE,
        PRIMARY KEY (cinsiyet_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS urun_cinsiyet (
        urun_cinsiyet_id INT NOT NULL AUTO_INCREMENT,
        urun_id INT NOT NULL,
        cinsiyet_id INT NOT NULL,
        PRIMARY KEY (urun_cinsiyet_id),
        UNIQUE KEY uq_urun_cinsiyet (urun_id, cinsiyet_id),
        CONSTRAINT fk_uc_urun FOREIGN KEY (urun_id) REFERENCES urunler (urun_id) ON DELETE CASCADE,
        CONSTRAINT fk_uc_cinsiyet FOREIGN KEY (cinsiyet_id) REFERENCES cinsiyetler (cinsiyet_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;
    `);

    await sequelize.query(`
      INSERT INTO cinsiyetler (cinsiyet_adi)
      VALUES ('Kadın'), ('Erkek'), ('Çocuk'), ('Unisex')
      ON DUPLICATE KEY UPDATE cinsiyet_adi = VALUES(cinsiyet_adi);
    `);

    await sequelize.query(`
      INSERT INTO urun_cinsiyet (urun_id, cinsiyet_id)
      SELECT u.urun_id,
        CASE
          WHEN LOWER(u.urun_adi) REGEXP 'kadin|kadın|bayan|kiz|kız' THEN (SELECT cinsiyet_id FROM cinsiyetler WHERE cinsiyet_adi = 'Kadın' LIMIT 1)
          WHEN LOWER(u.urun_adi) REGEXP 'erkek|bay|oglan|oğlan' THEN (SELECT cinsiyet_id FROM cinsiyetler WHERE cinsiyet_adi = 'Erkek' LIMIT 1)
          WHEN LOWER(u.urun_adi) REGEXP 'cocuk|çocuk|kids|bebek' THEN (SELECT cinsiyet_id FROM cinsiyetler WHERE cinsiyet_adi = 'Çocuk' LIMIT 1)
          ELSE (SELECT cinsiyet_id FROM cinsiyetler WHERE cinsiyet_adi = 'Unisex' LIMIT 1)
        END
      FROM urunler u
      ON DUPLICATE KEY UPDATE cinsiyet_id = VALUES(cinsiyet_id);
    `);

    console.log('Cinsiyet tables created/backfilled successfully.');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    await sequelize.close();
    process.exit(1);
  }
}

run();
