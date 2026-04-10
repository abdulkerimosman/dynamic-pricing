require('dotenv').config();
const { sequelize } = require('./src/models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('DB Connected!');
    
    // Create Table
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
      );
    `);
    console.log('Table created or already exists!');

    // Get all non-website channels
    const kanallar = await sequelize.query('SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 0', { type: sequelize.QueryTypes.SELECT });
    // Get all categories
    const kategoriler = await sequelize.query('SELECT kategori_id FROM kategoriler', { type: sequelize.QueryTypes.SELECT });

    // Clear old seeded data just in case
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await sequelize.query('TRUNCATE TABLE kanal_komisyon_kademeleri;');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');

    // Insert dummy data replicating the screenshot for ALL channels and ALL categories
    // 1st tier: >= 1526 -> 13%
    // 2nd tier: 1406 - 1525.99 -> 9.9%
    // 3rd tier: 1250.88 - 1405.99 -> 7%
    // 4th tier: 0 - 1250.87 -> 3.6%
    for (let c of kanallar) {
      for (let k of kategoriler) {
        await sequelize.query(`
          INSERT INTO kanal_komisyon_kademeleri (kanal_id, kategori_id, fiyat_alt_limit, fiyat_ust_limit, komisyon_orani)
          VALUES 
          (:kanal, :kat, 1526.00, 999999.00, 0.1300),
          (:kanal, :kat, 1406.00, 1525.99, 0.0990),
          (:kanal, :kat, 1250.88, 1405.99, 0.0700),
          (:kanal, :kat, 0.00, 1250.87, 0.0360)
        `, { replacements: { kanal: c.kanal_id, kat: k.kategori_id } });
      }
    }
    
    console.log('Dummy commission tiers inserted successfully!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}
run();
