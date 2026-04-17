/**
 * Sporthink — Full Database Seed
 * Populates 2025-01-01 through 2026-04-10 with realistic data covering:
 * - 50 products, 5 categories, 3 brands, 3 channels
 * - 16 months of monthly sales per product per channel
 * - Price history, competitor prices, alerts, price suggestions, campaigns
 */

require('dotenv').config();
const { sequelize } = require('./src/models');

// ── helpers ──────────────────────────────────────────────────────────────────
const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dateStr = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// ALL months from Jan 2025 through Apr 2026
function generateMonths() {
  const months = [];
  for (let y = 2025; y <= 2026; y++) {
    const maxMonth = y === 2026 ? 4 : 12;  // Stop at April 2026
    for (let m = 1; m <= maxMonth; m++) {
      months.push({ year: y, month: m });
    }
  }
  return months;
}

async function run() {
  const q = (sql, opts = {}) => sequelize.query(sql, { type: sequelize.QueryTypes.RAW, ...opts });

  await sequelize.authenticate();
  console.log('✅ DB connected');

  // ── WIPE EXISTING DATA (safe order) ──────────────────────────────────────
  await q('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of [
    'islem_log','hata_log','alertler','fiyat_onerileri','fiyat_gecmisi',
    'satislar','rakip_fiyatlar','stok','kanal_urun','kampanya_planlari',
    'kategori_sezon','kanal_komisyon_kademeleri','fiyatlandirma_kurallari',
    'urun_cinsiyet','urunler','rakipler','sezonlar','kanallar','kategoriler','marka','beden','cinsiyetler',
    'kullanici_rol','roller','kullanicilar'
  ]) {
    await q(`TRUNCATE TABLE ${t}`);
  }
  await q('SET FOREIGN_KEY_CHECKS = 1');
  console.log('🗑️  Tables cleared');

  // ── USERS & ROLES ─────────────────────────────────────────────────────────
  await q(`INSERT INTO roller (rol_id, rol_adi, aciklama) VALUES
    (1,'Admin','Tam yetki'),
    (2,'Operasyon','Fiyat onay/ret'),
    (3,'Analiz','Görüntüleme')
  `);

  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('password', 10);
  await q(`INSERT INTO kullanicilar (kullanici_id, ad_soyad, eposta, sifre_hash) VALUES
    (1,'Ahmet Geçgel','ahmet@sporthink.com.tr','${hash}'),
    (2,'Selen Yıldız','selen@sporthink.com','${hash}'),
    (3,'Analist Kullanıcı','analist@sporthink.com','${hash}')
  `);
  await q(`INSERT INTO kullanici_rol (kullanici_id, rol_id) VALUES (1,1),(2,2),(3,3)`);

  // ── CATEGORIES ────────────────────────────────────────────────────────────
  await q(`INSERT INTO kategoriler (kategori_id, kategori_adi, kar_beklentisi) VALUES
    (1,'Spor Ayakkabı',  0.3500),
    (2,'Spor Giyim',     0.3000),
    (3,'Aksesuar',       0.4000),
    (4,'Çanta & Sırt',  0.2800),
    (5,'Outdoor',        0.3200)
  `);

  // ── BRANDS ────────────────────────────────────────────────────────────────
  await q(`INSERT INTO marka (marka_id, marka_adi) VALUES
    (1,'Nike'), (2,'Adidas'), (3,'Puma'), (4,'New Balance'), (5,'Reebok')
  `);

  // ── SEASONS ───────────────────────────────────────────────────────────────
  await q(`INSERT INTO sezonlar (sezon_id, sezon_adi, baslangic_tarihi, bitis_tarihi) VALUES
    (1,'İlkbahar-Yaz 2025','2025-03-01','2025-08-31'),
    (2,'Sonbahar-Kış 2025','2025-09-01','2026-02-28'),
    (3,'İlkbahar-Yaz 2026','2026-03-01','2026-08-31')
  `);

  await q(`INSERT INTO kategori_sezon (kategori_id, sezon_id) VALUES
    (1,1),(1,2),(1,3),(2,1),(2,2),(2,3),(3,1),(3,2),(4,2),(5,1),(5,3)
  `);

  // ── SIZES ─────────────────────────────────────────────────────────────────
  await q(`INSERT INTO beden (beden_id, beden_adi) VALUES
    (1,'XS'),(2,'S'),(3,'M'),(4,'L'),(5,'XL'),(6,'XXL'),
    (7,'36'),(8,'37'),(9,'38'),(10,'39'),(11,'40'),(12,'41'),(13,'42'),(14,'43'),(15,'44')
  `);

  // ── GENDERS ─────────────────────────────────────────────────────────────
  await q(`INSERT INTO cinsiyetler (cinsiyet_id, cinsiyet_adi) VALUES
    (1,'Kadın'),(2,'Erkek'),(3,'Çocuk'),(4,'Unisex')
  `);

  // ── CHANNELS ──────────────────────────────────────────────────────────────
  await q(`INSERT INTO kanallar (kanal_id, kanal_adi, kanal_url, kanal_sahibi) VALUES
    (1,'Sporthink Web','https://sporthink.com',1),
    (2,'Trendyol',     'https://trendyol.com', 0),
    (3,'Hepsiburada',  'https://hepsiburada.com',0)
  `);

  // ── COMPETITORS ───────────────────────────────────────────────────────────
  await q(`INSERT INTO rakipler (rakip_id, rakip_adi, rakip_url) VALUES
    (1,'SportFactory','https://sportfactory.com'),
    (2,'Decathlon','https://decathlon.com.tr'),
    (3,'Intersport','https://intersport.com.tr')
  `);

  // ── PRICING RULES ─────────────────────────────────────────────────────────
  const ruleInserts = [];
  let ruleId = 1;
  for (const kanal of [1, 2, 3]) {
    for (const kat of [1, 2, 3, 4, 5]) {
      const isWeb = kanal === 1;
      // Targets set at ~80% of expected monthly sales per channel per category
      // 50 products / 5 categories = 10 products per category
      // Avg sale: 10 products × 12 months per product × avg price 1000 × avg qty 25 = ~3M/month/category across all channels
      // Per channel: web target 1.2M, marketplace 900K
      const aylikHedef = isWeb ? 1200000 : 900000;
      const haftalikHedef = Math.round(aylikHedef / 4.3);
      ruleInserts.push(`(${ruleId++},${kanal},${kat},${isWeb ? 0 : 0.13},${isWeb ? 0 : 15},${isWeb ? 0 : 25},0.40,0.12,0.98,0.05,${aylikHedef},${haftalikHedef},1,'2025-01-01',NULL)`);
    }
  }
  await q(`INSERT INTO fiyatlandirma_kurallari (kural_id,kanal_id,kategori_id,komisyon_orani,lojistik_gideri,kargo_ucreti,max_indirim,min_kar,rekabet_katsayisi,geri_gelinebilecek_yuzde,aylik_satis_hedefi,haftalik_satis_hedefi,aktiflik_durumu,gecerlilik_baslangic,gecerlilik_bitis) VALUES ${ruleInserts.join(',')}`);

  // ── PRODUCTS (50 products) ────────────────────────────────────────────────
  const SHOE_IMAGES = [
    'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/skwgyqrbfzhu6uyeh0gg/air-max-270-shoes-2V5C4p.png',
    'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/68ae7ea251f54c709a07ac7c017a4de0_9366/Ultraboost_22_Shoes_Black_GZ0127_01_standard.jpg',
    'https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_750,h_750/global/380537/01/sv01/fnd/TUR/fmt/png/Suede-Classic-XXI-Sneakers',
  ];
  const CLOTHING_IMAGES = [
    'https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/d17o8jyq8jtquavhxvts/dri-fit-legend-training-t-shirt-WXk3JF.png',
    'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/b05e4a95e2114e92a5b9acba00e45416_9366/Aeroready-Designed-to-Move-Sport-Stretch-Woven-Pants_Black_H45596_01_laydown.jpg',
  ];

  const productNames = [
    ['Air Max 270','Air Monarch IV','Air Zoom Pegasus','Free Run 5.0','React Infinity'],
    ['Ultraboost 22','NMD R1','Stan Smith','Superstar','Forum Low'],
    ['RS-X³','Suede Classic','Future Rider','Cell Venom','Cali Sport'],
    ['Fresh Foam 1080','990v5','574 Core','574 Lace','327'],
    ['Classic Leather','Club C 85','Nano X2','Floatride Energy','Legacy 83'],
  ];

  const brandIds = [1, 2, 3, 4, 5];
  const catIds   = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 5];

  let productId = 1;
  const products = [];

  for (let b = 0; b < 5; b++) {
    for (let n = 0; n < 10; n++) {
      const kat = catIds[(b * 2 + n) % catIds.length];
      const cost = rnd(150, 800);
      const img = kat === 1 ? pick(SHOE_IMAGES) : pick(CLOTHING_IMAGES);
      const stokKodu = `SK-${String(productId).padStart(3,'0')}-${brandIds[b]}${kat}${n}`;
      const barkod = `869${String(productId * 7 + 1000000).padStart(10,'0')}`;
      const name = productNames[b][n % 5];
      products.push({ id: productId, kat, brand: brandIds[b], cost, img, stokKodu, barkod, name });
      productId++;
    }
  }

  const productRows = products.map(p =>
    `(${p.id},'${p.barkod}','${p.stokKodu}','${p.name} - ${p.stokKodu}',${p.kat},${p.brand},${p.cost},'${p.img}')`
  );
  await q(`INSERT INTO urunler (urun_id,barkod,stok_kodu,urun_adi,kategori_id,marka_id,maliyet,resim_url) VALUES ${productRows.join(',')}`);
  console.log(`✅ ${products.length} products inserted`);

  // ── PRODUCT ↔ GENDER (M:N) ─────────────────────────────────────────────
  const urunCinsiyetRows = [];
  let urunCinsiyetId = 1;
  for (const p of products) {
    // Generated product names are not gendered; default to Unisex.
    urunCinsiyetRows.push(`(${urunCinsiyetId++},${p.id},4)`);
  }
  await q(`INSERT INTO urun_cinsiyet (urun_cinsiyet_id, urun_id, cinsiyet_id) VALUES ${urunCinsiyetRows.join(',')}`);
  console.log('✅ Product-gender mappings inserted');

  // ── STOCK (per product per size) ──────────────────────────────────────────
  const shoeBedens = [7,8,9,10,11,12,13,14,15];
  const clothBedens = [1,2,3,4,5,6];
  const stockRows = [];
  let stockId = 1;
  for (const p of products) {
    const bedens = p.kat === 1 ? shoeBedens : clothBedens;
    for (const bId of bedens) {
      const qty = Math.floor(rnd(0, 80));
      const coeff = qty === 0 ? 1.05 : qty > 50 ? 0.95 : 1.00;
      stockRows.push(`(${stockId++},${p.id},${bId},${qty},${coeff})`);
    }
  }
  await q(`INSERT INTO stok (stok_id,urun_id,beden_id,stok_miktari,stok_katsayisi) VALUES ${stockRows.join(',')}`);
  console.log('✅ Stock inserted');

  // ── KANAL_URUN (channel listings) ────────────────────────────────────────
  const kanalUrunRows = [];
  const kanalUrunMap = {}; // productId -> {kanalId: kanal_urun_id}
  let kuId = 1;
  for (const p of products) {
    kanalUrunMap[p.id] = {};
    const webListe = Math.round(p.cost * rnd(2.2, 3.5));
    const webIndirim = Math.round(webListe * (1 - rnd(0.05, 0.35)));
    const pyListe = webListe < 4999 ? webListe + 100 : webListe;
    const webDiscount = (webListe - webIndirim) / webListe;
    const pyDiscount = Math.max(0, webDiscount - 0.05);
    const pyIndirim = Math.round(pyListe * (1 - pyDiscount));

    // Web channel
    kanalUrunRows.push(`(${kuId},1,${p.id},${webListe},${webIndirim},NULL,NULL)`);
    kanalUrunMap[p.id][1] = kuId++;

    // Trendyol
    kanalUrunRows.push(`(${kuId},2,${p.id},NULL,NULL,${pyListe},${pyIndirim})`);
    kanalUrunMap[p.id][2] = kuId++;

    // Hepsiburada
    const hbIndirim = Math.round(pyIndirim * rnd(0.97, 1.03));
    kanalUrunRows.push(`(${kuId},3,${p.id},NULL,NULL,${pyListe},${hbIndirim})`);
    kanalUrunMap[p.id][3] = kuId++;
  }
  await q(`INSERT INTO kanal_urun (kanal_urun_id,kanal_id,urun_id,web_liste_fiyati,web_indirim_fiyati,pazaryeri_liste_fiyat,pazaryeri_indirim_fiyat) VALUES ${kanalUrunRows.join(',')}`);
  console.log('✅ Kanal-Urun listings inserted');

  // ── SALES (16 months: Jan 2025 – Apr 2026) ───────────────────────────────
  const months = generateMonths();
  const salesRows = [];
  let salesId = 1;
  for (const p of products) {
    for (const kanal of [1, 2, 3]) {
      const kuId = kanalUrunMap[p.id][kanal];
      for (const { year, month } of months) {
        const day = Math.floor(rnd(1, 25));
        const satisTarihi = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        // Seasonal adjustment: summer months and Q4 sell more
        const seasonFactor = (month >= 5 && month <= 8) || month === 11 || month === 12 ? 1.4 : 1.0;
        const qty = Math.max(1, Math.round(rnd(5, 50) * seasonFactor));
        const webListe = products.find(x => x.id === p.id);
        const birimFiyat = Math.round(p.cost * rnd(1.5, 2.8));
        salesRows.push(`(${salesId++},${kuId},${qty},${birimFiyat},${p.cost},'${satisTarihi}')`);
      }
    }
  }
  await q(`INSERT INTO satislar (satis_id,kanal_urun_id,satis_miktari,birim_fiyat,maliyet_snapshot,satis_tarihi) VALUES ${salesRows.join(',')}`);
  console.log(`✅ ${salesRows.length} sales records inserted`);

  // ── COMPETITOR PRICES ────────────────────────────────────────────────────
  const rakipFiyatRows = [];
  let rfId = 1;
  for (const p of products) {
    for (const rakipId of [1, 2, 3]) {
      for (const bId of [9, 10, 11]) { // 3 shoe sizes
        const fiyat = Math.round(p.cost * rnd(1.4, 3.2));
        rakipFiyatRows.push(`(${rfId++},${p.id},${rakipId},2,${bId},${fiyat})`);
      }
    }
  }
  await q(`INSERT INTO rakip_fiyatlar (rakip_fiyat_id,urun_id,rakip_id,kanal_id,beden_id,fiyat) VALUES ${rakipFiyatRows.join(',')}`);
  console.log('✅ Competitor prices inserted');

  // ── PRICE HISTORY (6-12 price changes per product over 2025) ─────────────
  const gecmisRows = [];
  let gecmisId = 1;
  for (const p of products) {
    const kuWebId = kanalUrunMap[p.id][1];
    const numChanges = Math.floor(rnd(4, 10));
    let lastPrice = Math.round(p.cost * rnd(2.5, 3.2));
    for (let i = 0; i < numChanges; i++) {
      const monthOffset = Math.floor((i / numChanges) * 15);
      const changeDate = new Date(2025, monthOffset, Math.floor(rnd(1, 28)));
      const newPrice = Math.round(lastPrice * rnd(0.88, 1.12));
      gecmisRows.push(`(${gecmisId++},${kuWebId},${lastPrice},${newPrice},1,'Periyodik fiyat güncelleme','${changeDate.toISOString().slice(0,19)}')`);
      lastPrice = newPrice;
    }
  }
  await q(`INSERT INTO fiyat_gecmisi (gecmis_id,kanal_urun_id,eski_fiyat,yeni_fiyat,degistiren_kullanici_id,degisim_nedeni,degisim_tarihi) VALUES ${gecmisRows.join(',')}`);
  console.log('✅ Price history inserted');

  // ── ALERTS ────────────────────────────────────────────────────────────────
  const alertRows = [];
  let alertId = 1;
  const alertTypes = ['rakip_fiyat_dustu','stok_kritik','karlilik_ihlali'];
  const alertMessages = {
    rakip_fiyat_dustu: (p) => `Rakip fiyatı %${Math.floor(rnd(10,25))} düştü: ${p.stokKodu}`,
    stok_kritik:       (p) => `${p.stokKodu} kritik stok seviyesi: 3 adet kaldı`,
    karlilik_ihlali:   (p) => `${p.stokKodu} için karlılık hedefin altında: %8`,
  };
  for (const p of products.slice(0, 20)) { // 20 active alerts
    const kuId = kanalUrunMap[p.id][pick([1,2,3])];
    const tipi = pick(alertTypes);
    const durum = Math.random() > 0.4 ? 'acik' : 'cozuldu';
    alertRows.push(`(${alertId++},${kuId},'${tipi}','${alertMessages[tipi](p)}','${durum}')`);
  }
  await q(`INSERT INTO alertler (alert_id,kanal_urun_id,alert_tipi,mesaj,durum) VALUES ${alertRows.join(',')}`);

  // ── PRICE SUGGESTIONS ────────────────────────────────────────────────────
  const oneriRows = [];
  let oneriId = 1;
  for (const p of products.slice(0, 30)) {
    const kuWebId = kanalUrunMap[p.id][1];
    const mevcutFiyat = Math.round(p.cost * rnd(2.0, 3.0));
    const onerilenFiyat = Math.round(mevcutFiyat * rnd(0.90, 1.15));
    const durum = pick(['beklemede','beklemede','beklemede','onaylandi','reddedildi']);
    oneriRows.push(`(${oneriId++},${kuWebId},${mevcutFiyat},${onerilenFiyat},'Rakip analizi ve stok durumuna göre önerilen fiyat','${durum}')`);
  }
  await q(`INSERT INTO fiyat_onerileri (oneri_id,kanal_urun_id,mevcut_fiyat,onerilen_fiyat,neden,durum) VALUES ${oneriRows.join(',')}`);
  console.log('✅ Price suggestions inserted');

  // ── CAMPAIGNS ────────────────────────────────────────────────────────────
  await q(`INSERT INTO kampanya_planlari (kanal_id,sezon_id,kampanya_adi,baslangic_tarihi,bitis_tarihi,hedef_indirim_orani,hedef_karlilik) VALUES
    (2,1,'Trendyol Yaz Kampanyası 2025','2025-06-01','2025-08-31',0.30,0.15),
    (3,1,'Hepsiburada Yaz İndirimi','2025-07-01','2025-07-31',0.25,0.12),
    (1,2,'Sporthink Kış Koleksiyonu','2025-11-01','2026-01-31',0.20,0.20),
    (2,3,'Trendyol İlkbahar 2026','2026-03-01','2026-04-30',0.35,0.13),
    (2,2,'Trendyol Ebeveyn Günü','2026-05-05','2026-05-12',0.40,0.10)
  `);

  // ── COMMISSION TIERS ─────────────────────────────────────────────────────
  const tierRows = [];
  let tierId = 1;
  for (const kanal of [2, 3]) { // only marketplaces
    for (const kat of [1, 2, 3, 4, 5]) {
      tierRows.push(`(${tierId++},${kanal},${kat},1526.00,999999.00,0.1300)`);
      tierRows.push(`(${tierId++},${kanal},${kat},1406.00,1525.99,0.0990)`);
      tierRows.push(`(${tierId++},${kanal},${kat},1250.88,1405.99,0.0700)`);
      tierRows.push(`(${tierId++},${kanal},${kat},0.00,1250.87,0.0360)`);
    }
  }
  await q(`INSERT INTO kanal_komisyon_kademeleri (komisyon_id,kanal_id,kategori_id,fiyat_alt_limit,fiyat_ust_limit,komisyon_orani) VALUES ${tierRows.join(',')}`);

  // ── AUDIT LOG (sample) ───────────────────────────────────────────────────
  await q(`INSERT INTO islem_log (kullanici_id,islem_tipi,tablo_adi,kayit_id,aciklama,ip_adresi) VALUES
    (1,'LOGIN','kullanicilar','1','Admin girişi','127.0.0.1'),
    (2,'LOGIN','kullanicilar','2','Selen girişi','127.0.0.1'),
    (1,'PRICE_APPROVED','kanal_urun','1','İlk fiyat onayı','127.0.0.1')
  `);

  console.log('');
  console.log('🎉 SEED COMPLETE!');
  console.log(`   Products:          ${products.length}`);
  console.log(`   Stock records:     ${stockRows.length}`);
  console.log(`   Kanal-Urun:        ${kanalUrunRows.length}`);
  console.log(`   Sales records:     ${salesRows.length}`);
  console.log(`   Price history:     ${gecmisRows.length}`);
  console.log(`   Competitor prices: ${rakipFiyatRows.length}`);
  console.log(`   Alerts:            ${alertRows.length}`);
  console.log(`   Suggestions:       ${oneriRows.length}`);
  console.log(`   Commission tiers:  ${tierRows.length}`);
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Seed failed:', e.message);
  console.error(e);
  process.exit(1);
});
