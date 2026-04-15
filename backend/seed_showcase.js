require('dotenv').config();
const { execSync } = require('child_process');
const { sequelize } = require('./src/models');

function makeRng(seed = 20260414) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function pickN(arr, start, n) {
  return arr.slice(start, start + n);
}

async function run() {
  const rng = makeRng(20260414);

  // Ensure commission tier table exists before seed_full.js truncates it.
  await sequelize.authenticate();
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

  console.log('1) Running full base seed...');
  execSync('node seed_full.js', {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });

  console.log('\n2) Applying showcase overlays...');
  await sequelize.authenticate();

  const q = async (sql, opts = {}) => {
    const [rows] = await sequelize.query(sql, opts);
    return rows;
  };

  const now = new Date();

  const channels = await q(
    'SELECT kanal_id, kanal_adi, kanal_sahibi FROM kanallar ORDER BY kanal_id'
  );
  const webChannel = channels.find((c) => Number(c.kanal_sahibi) === 1) || channels[0];
  const marketplaceChannels = channels.filter((c) => Number(c.kanal_sahibi) === 0);

  if (!webChannel) throw new Error('No channel found in DB');

  const products = await q(`
    SELECT
      u.urun_id,
      u.stok_kodu,
      u.kategori_id,
      u.maliyet,
      ku.kanal_urun_id,
      ku.web_liste_fiyati,
      ku.web_indirim_fiyati
    FROM urunler u
    JOIN kanal_urun ku ON ku.urun_id = u.urun_id
    WHERE ku.kanal_id = :webChannelId
    ORDER BY u.urun_id
  `, { replacements: { webChannelId: webChannel.kanal_id } });

  if (products.length < 24) {
    throw new Error('Need at least 24 products for showcase scenarios.');
  }

  const lowStock = pickN(products, 0, 8);
  const overStock = pickN(products, 8, 8);
  const marginRisk = pickN(products, 16, 8);
  const competitorPressure = pickN(products, 4, 8);

  // 2.0 SALES + TARGET SHAPE for cleaner dashboard curves
  // Keep business-sense seasonality while making lines visually readable:
  // - stronger summer + Q4 peaks
  // - September trough
  // - marketplace channels slightly differentiated
  // - target line aligned to realistic total monthly ciro
  await q(`
    UPDATE satislar s
    JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
    SET
      s.satis_miktari = GREATEST(1, ROUND(
        s.satis_miktari *
        (CASE MONTH(s.satis_tarihi)
          WHEN 1 THEN 0.90
          WHEN 2 THEN 0.94
          WHEN 3 THEN 1.00
          WHEN 4 THEN 0.96
          WHEN 5 THEN 1.10
          WHEN 6 THEN 1.20
          WHEN 7 THEN 1.26
          WHEN 8 THEN 1.18
          WHEN 9 THEN 0.78
          WHEN 10 THEN 0.90
          WHEN 11 THEN 1.14
          WHEN 12 THEN 1.24
          ELSE 1.00
        END) *
        (CASE
          WHEN ku.kanal_id = 1 THEN 1.00
          WHEN ku.kanal_id = 2 AND MONTH(s.satis_tarihi) IN (6,7,11,12) THEN 1.10
          WHEN ku.kanal_id = 2 THEN 1.04
          WHEN ku.kanal_id = 3 AND MONTH(s.satis_tarihi) IN (9,10) THEN 0.90
          WHEN ku.kanal_id = 3 THEN 0.97
          ELSE 1.00
        END)
      )),
      s.birim_fiyat = ROUND(
        s.birim_fiyat *
        (CASE MONTH(s.satis_tarihi)
          WHEN 7 THEN 0.99
          WHEN 8 THEN 0.98
          WHEN 11 THEN 1.01
          WHEN 12 THEN 1.02
          ELSE 1.00
        END),
        2
      )
    WHERE YEAR(s.satis_tarihi) IN (2025, 2026)
  `);

  // Bring KPI target line closer to realized performance for better readability.
  // Per-category per-channel monthly targets (sum across channels/categories ~2.6M)
  await q(`
    UPDATE fiyatlandirma_kurallari
    SET
      aylik_satis_hedefi = CASE
        WHEN kanal_id = 1 THEN 170000
        WHEN kanal_id = 2 THEN 190000
        WHEN kanal_id = 3 THEN 160000
        ELSE 170000
      END,
      haftalik_satis_hedefi = CASE
        WHEN kanal_id = 1 THEN ROUND(170000 / 4.3)
        WHEN kanal_id = 2 THEN ROUND(190000 / 4.3)
        WHEN kanal_id = 3 THEN ROUND(160000 / 4.3)
        ELSE ROUND(170000 / 4.3)
      END,
      rekabet_katsayisi = CASE
        WHEN kanal_id = 2 THEN 0.97
        WHEN kanal_id = 3 THEN 0.99
        ELSE 1.00
      END
    WHERE aktiflik_durumu = 1
  `);

  // 2.1 STOCK SHAPE: make clear low/over/normal buckets for Stok page
  for (const p of lowStock) {
    await q(
      `
      UPDATE stok
      SET
        stok_miktari = CASE
          WHEN beden_id % 3 = 0 THEN 0
          ELSE 1 + FLOOR(RAND() * 3)
        END,
        stok_katsayisi = 1.05
      WHERE urun_id = :urunId
      `,
      { replacements: { urunId: p.urun_id } }
    );
  }

  for (const p of overStock) {
    await q(
      `
      UPDATE stok
      SET
        stok_miktari = 45 + FLOOR(RAND() * 40),
        stok_katsayisi = 0.95
      WHERE urun_id = :urunId
      `,
      { replacements: { urunId: p.urun_id } }
    );
  }

  // Keep others normal/healthy
  const lowAndOver = new Set([...lowStock, ...overStock].map((p) => p.urun_id));
  for (const p of products) {
    if (lowAndOver.has(p.urun_id)) continue;
    await q(
      `
      UPDATE stok
      SET
        stok_miktari = 10 + FLOOR(RAND() * 20),
        stok_katsayisi = 1.00
      WHERE urun_id = :urunId
      `,
      { replacements: { urunId: p.urun_id } }
    );
  }

  // 2.2 COMPETITOR PRICE SHAPE: create visible gaps for dashboard + urun analizi
  for (const p of products) {
    const strongGap = competitorPressure.some((x) => x.urun_id === p.urun_id);
    const base = Number(p.web_indirim_fiyati || p.web_liste_fiyati || p.maliyet * 2.2);

    if (strongGap) {
      // make competitors significantly cheaper so fark >= 20% in dashboard
      const minRakip = Math.max(1, Math.round(base * 0.72));
      await q(
        `
        UPDATE rakip_fiyatlar
        SET fiyat = :fiyat, veri_kazima_zamani = NOW()
        WHERE urun_id = :urunId
        `,
        { replacements: { urunId: p.urun_id, fiyat: minRakip } }
      );
    } else {
      // keep near our price
      const near = Math.max(1, Math.round(base * (0.95 + rng() * 0.12)));
      await q(
        `
        UPDATE rakip_fiyatlar
        SET fiyat = :fiyat, veri_kazima_zamani = DATE_SUB(NOW(), INTERVAL 1 DAY)
        WHERE urun_id = :urunId
        `,
        { replacements: { urunId: p.urun_id, fiyat: near } }
      );
    }
  }

  // 2.3 PRICE SUGGESTIONS + HISTORY + AUDIT
  await q('DELETE FROM fiyat_onerileri');
  await q('DELETE FROM fiyat_gecmisi');

  const showcaseProducts = products.slice(0, 32);
  const pending = showcaseProducts.slice(0, 16);
  const approved = showcaseProducts.slice(16, 24);
  const rejected = showcaseProducts.slice(24, 32);

  // Pending suggestions
  for (const p of pending) {
    const current = Number(p.web_indirim_fiyati || p.web_liste_fiyati || 0);
    const rec = Math.round(current * (0.92 + rng() * 0.18));
    await q(
      `
      INSERT INTO fiyat_onerileri
      (kanal_urun_id, mevcut_fiyat, onerilen_fiyat, neden, durum, olusturma_tarihi)
      VALUES (:kuId, :mevcut, :oneri, :neden, 'beklemede', NOW())
      `,
      {
        replacements: {
          kuId: p.kanal_urun_id,
          mevcut: current,
          oneri: rec,
          neden: 'Rakip fiyatları, stok günleri ve kategori karlılık hedefi baz alınarak önerildi.',
        },
      }
    );
  }

  // Approved suggestions (and write history)
  for (const p of approved) {
    const current = Number(p.web_indirim_fiyati || p.web_liste_fiyati || 0);
    const rec = Math.round(current * (0.98 + rng() * 0.08));

    await q(
      `
      INSERT INTO fiyat_onerileri
      (kanal_urun_id, mevcut_fiyat, onerilen_fiyat, neden, durum, onaylayan_kullanici_id, onay_tarihi, olusturma_tarihi)
      VALUES (:kuId, :mevcut, :oneri, :neden, 'onaylandi', 1, DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY))
      `,
      {
        replacements: {
          kuId: p.kanal_urun_id,
          mevcut: current,
          oneri: rec,
          neden: 'Onaylanan optimize fiyat: kanal hedef marjı ve rekabet dengesi sağlandı.',
        },
      }
    );

    await q(
      `
      INSERT INTO fiyat_gecmisi
      (kanal_urun_id, eski_fiyat, yeni_fiyat, degistiren_kullanici_id, degisim_nedeni, degisim_tarihi)
      VALUES (:kuId, :eski, :yeni, 1, 'Showcase onay akışı', DATE_SUB(NOW(), INTERVAL 2 DAY))
      `,
      { replacements: { kuId: p.kanal_urun_id, eski: current, yeni: rec } }
    );
  }

  // Rejected suggestions
  for (const p of rejected) {
    const current = Number(p.web_indirim_fiyati || p.web_liste_fiyati || 0);
    const rec = Math.round(current * (0.80 + rng() * 0.05));
    await q(
      `
      INSERT INTO fiyat_onerileri
      (kanal_urun_id, mevcut_fiyat, onerilen_fiyat, neden, durum, onaylayan_kullanici_id, onay_tarihi, olusturma_tarihi)
      VALUES (:kuId, :mevcut, :oneri, :neden, 'reddedildi', 2, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY))
      `,
      {
        replacements: {
          kuId: p.kanal_urun_id,
          mevcut: current,
          oneri: rec,
          neden: 'Öneri minimum karlılık eşiğinin altına düştüğü için reddedildi.',
        },
      }
    );
  }

  // 2.4 ALERTS: open alerts should clearly reflect stock/risk/competitor states
  await q('DELETE FROM alertler');

  const insertAlert = async (kuId, tip, mesaj, open = true) => {
    await q(
      `
      INSERT INTO alertler
      (kanal_urun_id, alert_tipi, mesaj, durum, olusturma_tarihi, cozulme_tarihi)
      VALUES (:kuId, :tip, :mesaj, :durum, :createdAt, :closedAt)
      `,
      {
        replacements: {
          kuId,
          tip,
          mesaj,
          durum: open ? 'acik' : 'cozuldu',
          createdAt: open ? now : new Date(now.getTime() - 4 * 24 * 3600 * 1000),
          closedAt: open ? null : new Date(now.getTime() - 2 * 24 * 3600 * 1000),
        },
      }
    );
  };

  for (const p of lowStock) {
    await insertAlert(
      p.kanal_urun_id,
      'stok_kritik',
      `${p.stok_kodu} kritik stok seviyesinde. Tedarik planı önerilir.`,
      true
    );
  }

  for (const p of competitorPressure.slice(0, 6)) {
    await insertAlert(
      p.kanal_urun_id,
      'rakip_fiyat_dustu',
      `${p.stok_kodu} rakip fiyatı yaklaşık %22 geride kaldı.`,
      true
    );
  }

  for (const p of marginRisk.slice(0, 5)) {
    await insertAlert(
      p.kanal_urun_id,
      'karlilik_ihlali',
      `${p.stok_kodu} önerilen fiyat min kar eşiği altında kalıyor.`,
      true
    );
  }

  // A few solved alerts for historical view
  for (const p of overStock.slice(0, 4)) {
    await insertAlert(
      p.kanal_urun_id,
      'stok_yuksek',
      `${p.stok_kodu} stok fazlası kampanya ile optimize edildi.`,
      false
    );
  }

  // 2.5 Campaigns: clear, realistic roadmap for demos
  await q('DELETE FROM kampanya_planlari');

  const mp1 = marketplaceChannels[0] ? marketplaceChannels[0].kanal_id : webChannel.kanal_id;
  const mp2 = marketplaceChannels[1] ? marketplaceChannels[1].kanal_id : mp1;

  await q(
    `
    INSERT INTO kampanya_planlari
    (kanal_id, sezon_id, kampanya_adi, baslangic_tarihi, bitis_tarihi, hedef_indirim_orani, hedef_karlilik)
    VALUES
    (:k1, 3, 'Yaz Performans Ayakkabı Kampanyası', '2026-04-20', '2026-05-20', 0.22, 0.14),
    (:k2, 3, 'Aksesuar Hızlı Devir Kampanyası', '2026-04-18', '2026-05-05', 0.18, 0.16),
    (:k1, 3, 'Fitness Haftası Seçili Ürünler', '2026-05-10', '2026-05-17', 0.25, 0.13),
    (:web, 3, 'Web Özel Premium Koleksiyon', '2026-04-15', '2026-05-15', 0.12, 0.21)
    `,
    { replacements: { k1: mp1, k2: mp2, web: webChannel.kanal_id } }
  );

  // 2.6 Audit log examples for storytelling in approvals
  await q('DELETE FROM islem_log WHERE islem_tipi IN (\'PRICE_APPROVED\', \'IMPORT\')');
  await q(
    `
    INSERT INTO islem_log
    (kullanici_id, islem_tipi, tablo_adi, kayit_id, aciklama, ip_adresi, islem_tarihi)
    VALUES
    (1, 'IMPORT', 'satislar', 'bulk-2026-04', 'Showcase veri importu tamamlandı', '127.0.0.1', NOW()),
    (1, 'PRICE_APPROVED', 'kanal_urun', 'showcase-1', 'Örnek fiyat onayı akışı işlendi', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 1 DAY))
    `
  );

  // 2.7 Summary for the operator
  const [counts] = await q(`
    SELECT
      (SELECT COUNT(*) FROM urunler) as urun,
      (SELECT COUNT(*) FROM stok) as stok,
      (SELECT COUNT(*) FROM satislar) as satis,
      (SELECT COUNT(*) FROM rakip_fiyatlar) as rakip_fiyat,
      (SELECT COUNT(*) FROM fiyat_onerileri WHERE durum = 'beklemede') as oneri_bekleyen,
      (SELECT COUNT(*) FROM fiyat_onerileri WHERE durum = 'onaylandi') as oneri_onayli,
      (SELECT COUNT(*) FROM fiyat_onerileri WHERE durum = 'reddedildi') as oneri_red,
      (SELECT COUNT(*) FROM alertler WHERE durum = 'acik') as alert_acik,
      (SELECT COUNT(*) FROM alertler WHERE durum = 'cozuldu') as alert_cozuldu,
      (SELECT COUNT(*) FROM kampanya_planlari) as kampanya
  `);

  console.log('\n✅ Showcase seed completed.');
  console.log('   Products          :', counts.urun);
  console.log('   Stock rows        :', counts.stok);
  console.log('   Sales rows        :', counts.satis);
  console.log('   Competitor prices :', counts.rakip_fiyat);
  console.log('   Suggestions       :', `beklemede=${counts.oneri_bekleyen}, onayli=${counts.oneri_onayli}, red=${counts.oneri_red}`);
  console.log('   Alerts            :', `acik=${counts.alert_acik}, cozuldu=${counts.alert_cozuldu}`);
  console.log('   Campaign plans    :', counts.kampanya);
  console.log('\nDemo login: ahmet@sporthink.com.tr / password');

  await sequelize.close();
}

run().catch(async (err) => {
  console.error('❌ showcase seed failed:', err.message);
  try { await sequelize.close(); } catch (_) {}
  process.exit(1);
});
