'use strict';

const XLSX = require('xlsx');
const { sequelize } = require('../models');

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function parseNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCommissionRate(value) {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

function findFirstNumeric(row, aliases) {
  for (const alias of aliases) {
    const parsed = parseNum(row[normalizeHeader(alias)]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function scoreCandidate(price, commissionRate, cost) {
  if (!Number.isFinite(price)) return null;

  const safeCommission = Number.isFinite(commissionRate) ? commissionRate : 0;
  const safeCost = Number.isFinite(cost) ? cost : 0;
  const karTutar = price - safeCost - (price * safeCommission);
  const karOrani = safeCost > 0 ? karTutar / safeCost : Number.NEGATIVE_INFINITY;

  return {
    price,
    commissionRate: safeCommission,
    karTutar,
    karOrani,
  };
}

function pickBestPrice(row) {
  const cost = findFirstNumeric(row, ['maliyet']) || 0;
  const defaultCommission = findFirstNumeric(row, ['komisyon', 'komisyon_orani', 'komisyonoran']) || 0;

  const candidateGroups = [
    {
      label: 'tier_1',
      priceAliases: ['fiyat1', 'fiyat_1', 'fiyat_alt_limit1', 'fiyat_alt_limit_1', 'fiyataltlimit1'],
      commissionAliases: ['komisyon1', 'komisyon_1', 'komisyon_orani1', 'komisyon_orani_1'],
    },
    {
      label: 'tier_2',
      priceAliases: ['fiyat2', 'fiyat_2', 'fiyat_ust_limit2', 'fiyat_ust_limit_2', 'fiyatustlimit2', 'fiyat_alt_limit2', 'fiyat_alt_limit_2', 'fiyataltlimit2'],
      commissionAliases: ['komisyon2', 'komisyon_2', 'komisyon_orani2', 'komisyon_orani_2'],
    },
    {
      label: 'tier_3',
      priceAliases: ['fiyat3', 'fiyat_3', 'fiyat_ust_limit3', 'fiyat_ust_limit_3', 'fiyatustlimit3', 'fiyat_alt_limit3', 'fiyat_alt_limit_3', 'fiyataltlimit3'],
      commissionAliases: ['komisyon3', 'komisyon_3', 'komisyon_orani3', 'komisyon_orani_3'],
    },
    {
      label: 'tier_4',
      priceAliases: ['fiyat4', 'fiyat_4', 'fiyat_ust_limit4', 'fiyat_ust_limit_4', 'fiyatustlimit4', 'fiyat_alt_limit4', 'fiyat_alt_limit_4', 'fiyataltlimit4'],
      commissionAliases: ['komisyon4', 'komisyon_4', 'komisyon_orani4', 'komisyon_orani_4'],
    },
    {
      label: 'current',
      priceAliases: ['guncel_py_satis_fiyati', 'guncel_pysatisfiyati', 'pazaryeri_indirim_fiyati', 'mevcut_fiyat', 'komisyona_esas_fiyat', 'satis_fiyati'],
      commissionAliases: ['komisyon', 'komisyon_orani', 'komisyonoran'],
    },
  ];

  const candidates = candidateGroups
    .map((group) => {
      const price = findFirstNumeric(row, group.priceAliases);
      if (!Number.isFinite(price)) return null;

      const commissionRate = findFirstNumeric(row, group.commissionAliases);
      const candidate = scoreCandidate(price, normalizeCommissionRate(commissionRate !== null ? commissionRate : defaultCommission), cost);
      return candidate ? { ...candidate, label: group.label } : null;
    })
    .filter(Boolean);

  if (!candidates.length) {
    return {
      chosenPrice: null,
      chosenKarOrani: null,
      chosenKarTutar: null,
      chosenSource: '',
    };
  }

  candidates.sort((a, b) => {
    if (b.karOrani !== a.karOrani) return b.karOrani - a.karOrani;
    if (b.karTutar !== a.karTutar) return b.karTutar - a.karTutar;
    return b.price - a.price;
  });

  const best = candidates[0];
  return {
    chosenPrice: Math.round(best.price * 100) / 100,
    chosenKarOrani: Math.round(best.karOrani * 10000) / 100,
    chosenKarTutar: Math.round(best.karTutar * 100) / 100,
    chosenSource: best.label,
  };
}

module.exports = async function (fastify, opts) {
  // Get all marketplace channels (kanal_sahibi = 0)
  fastify.get('/kanallar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const kanallar = await sequelize.query(`
      SELECT kanal_id, kanal_adi 
      FROM kanallar 
      WHERE kanal_sahibi = 0
    `, { type: sequelize.QueryTypes.SELECT });
    return kanallar;
  });

  // Get products and calculate marketplace prices dynamically
  fastify.get('/urunler/:kanalId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanalId } = request.params;

    // Fetch product details joined with our website price and the target channel's current live prices
    const data = await sequelize.query(`
      SELECT 
        u.urun_id,
        u.stok_kodu as stokKodu,
        u.maliyet,
        u.urun_adi as stokAdi,
        u.barkod,
        u.resim_url as fotograf,
        m.marka_adi as marka,
        k.kategori_adi as kategori,
        (
          SELECT GROUP_CONCAT(DISTINCT s.sezon_adi ORDER BY s.sezon_adi SEPARATOR ', ')
          FROM kategori_sezon ks
          JOIN sezonlar s ON s.sezon_id = ks.sezon_id
          WHERE ks.kategori_id = u.kategori_id
        ) as sezon,
        COALESCE((
          SELECT CASE
            WHEN COUNT(*) > 1 THEN 'Unisex'
            ELSE MAX(c.cinsiyet_adi)
          END
          FROM urun_cinsiyet uc
          JOIN cinsiyetler c ON c.cinsiyet_id = uc.cinsiyet_id
          WHERE uc.urun_id = u.urun_id
        ), 'Unisex') as cinsiyet,
        (SELECT SUM(stok_miktari) FROM stok s WHERE s.urun_id = u.urun_id) as toplamStok,
        ku_web.web_liste_fiyati as webListeFiyat,
        ku_web.web_indirim_fiyati as webIndirimliFiyat,
        ku_py.pazaryeri_indirim_fiyat as guncelPySatisFiyati
      FROM urunler u
      LEFT JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN kategoriler k ON u.kategori_id = k.kategori_id
      LEFT JOIN kanal_urun ku_web ON u.urun_id = ku_web.urun_id AND ku_web.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1)
      LEFT JOIN kanal_urun ku_py ON u.urun_id = ku_py.urun_id AND ku_py.kanal_id = :kanalId
    `, { replacements: { kanalId }, type: sequelize.QueryTypes.SELECT });

    // Apply the Pricing Algorithm rules based on Selen's business logic
    const results = data.map(urun => {
      const webListeFiyat = parseFloat(urun.webListeFiyat) || 0;
      const webIndirimliFiyat = parseFloat(urun.webIndirimliFiyat) || 0;
      
      // Calculate Web Indirim %
      let webIndirimOrani = 0;
      if (webListeFiyat > 0 && webIndirimliFiyat > 0 && webListeFiyat > webIndirimliFiyat) {
        webIndirimOrani = (webListeFiyat - webIndirimliFiyat) / webListeFiyat;
      }
      
      // 1. Pazaryeri Liste Fiyatı
      let pyListeFiyati = webListeFiyat;
      if (pyListeFiyati < 4999 && pyListeFiyati > 0) {
        pyListeFiyati += 100;
      }

      // 2. Pazaryeri Indirim Oranı
      let pyIndirimOrani = 0;
      if (webIndirimOrani > 0) {
        pyIndirimOrani = webIndirimOrani - 0.05; // "indirim oranından %5 azaltarak"
        if (pyIndirimOrani < 0) pyIndirimOrani = 0;
      }

      // 3. Pazaryeri Indirimli Fiyat
      let pyIndirimliFiyat = pyListeFiyati;
      if (pyIndirimOrani > 0) {
        pyIndirimliFiyat = pyListeFiyati * (1 - pyIndirimOrani);
      }

      // 4. Check < 4999 condition
      if (pyIndirimliFiyat < 4999 && pyIndirimliFiyat > 0) {
        pyIndirimliFiyat += 100;
      }

      // 5. Final fallback check
      // "Bu hesaba göre çıkan son fiyat ilk fiyattan yüksek kalırsa ürüne indirim uygulanmaz. İlk fiyat ne ise ikinci fiyatta o girilir"
      // Wait: if pyIndirimliFiyat ends up higher than pyListeFiyati, revert it.
      if (pyIndirimliFiyat > pyListeFiyati) {
        pyIndirimliFiyat = pyListeFiyati;
        pyIndirimOrani = 0;
      }

      return {
        ...urun,
        webListeFiyat: webListeFiyat,
        webIndirimliFiyat: webIndirimliFiyat,
        webIndirimYuzde: Math.round(webIndirimOrani * 100),
        pyIndirimYuzde: Math.round(pyIndirimOrani * 100),
        pyListeFiyati: Math.round(pyListeFiyati),
        pyIndirimliFiyati: Math.round(pyIndirimliFiyat),
      };
    });

    return results;
  });

  // Komisyon Analizleri Data
  fastify.get('/komisyon/:kanalId/:stokKodu', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanalId } = request.params;
    const rawStokKodu = request.params.stokKodu;
    let stokKodu = rawStokKodu;
    try {
      stokKodu = decodeURIComponent(rawStokKodu);
    } catch (e) {
      stokKodu = rawStokKodu;
    }

    const urunSql = await sequelize.query(`
      SELECT 
        u.urun_id, 
        u.maliyet,
        u.kategori_id,
        ku.pazaryeri_indirim_fiyat as fiyat, 
        k.kar_beklentisi,
        fk.min_kar as kanal_min_kar
      FROM urunler u
      LEFT JOIN kanal_urun ku ON u.urun_id = ku.urun_id AND ku.kanal_id = :kanalId
      LEFT JOIN kategoriler k ON u.kategori_id = k.kategori_id
      LEFT JOIN fiyatlandirma_kurallari fk ON fk.kanal_id = :kanalId AND fk.kategori_id = u.kategori_id
      WHERE u.stok_kodu = :stokKodu LIMIT 1
    `, { replacements: { kanalId, stokKodu }, type: sequelize.QueryTypes.SELECT });

    if (!urunSql.length) return reply.code(404).send({ error: 'Urun bulunamadi' });
    const urun = urunSql[0];
    const satisFiyati = parseFloat(urun.fiyat) || 2567;
    const maliyet = parseFloat(urun.maliyet) || 1000;
    const minKar = parseFloat(urun.kar_beklentisi) || 0.15; // From category
    const kanalMinKar = parseFloat(urun.kanal_min_kar) || 0.10; // From channel rules

    // Fetch the specific commission limits for this channel and this product's category
    const komisyonTiers = await sequelize.query(`
      SELECT fiyat_alt_limit, fiyat_ust_limit, komisyon_orani * 100 as oran 
      FROM kanal_komisyon_kademeleri
      WHERE kanal_id = :kanalId AND kategori_id = :kategori_id
      ORDER BY komisyon_orani DESC
      LIMIT 4
    `, { replacements: { kanalId, kategori_id: urun.kategori_id }, type: sequelize.QueryTypes.SELECT });

    return {
      fiyatAltLimit1: parseFloat(komisyonTiers[0]?.fiyat_alt_limit) || 1526,
      fiyatUstLimit2: parseFloat(komisyonTiers[1]?.fiyat_ust_limit) || 1525.99,
      fiyatAltLimit2: parseFloat(komisyonTiers[1]?.fiyat_alt_limit) || 1406,
      fiyatUstLimit3: parseFloat(komisyonTiers[2]?.fiyat_ust_limit) || 1405.99,
      fiyatAltLimit3: parseFloat(komisyonTiers[2]?.fiyat_alt_limit) || 1250.88,
      fiyatUstLimit4: parseFloat(komisyonTiers[3]?.fiyat_ust_limit) || 1250.87,
      komisyon1: parseFloat(komisyonTiers[0]?.oran) || 13,
      komisyon2: parseFloat(komisyonTiers[1]?.oran) || 9.9,
      komisyon3: parseFloat(komisyonTiers[2]?.oran) || 7,
      komisyon4: parseFloat(komisyonTiers[3]?.oran) || 3.6,
      komisyonaEsasFiyat: satisFiyati,
      guncelPySatisFiyati: satisFiyati,
      maliyet: maliyet,
      minKarOrani: minKar * 100, // convert 0.15 -> 15
      kanalMinKarOrani: kanalMinKar * 100
    };
  });

  // GET /api/kampanya/kategoriler
  fastify.get('/kategoriler', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    return await sequelize.query('SELECT kategori_id, kategori_adi FROM kategoriler', { type: sequelize.QueryTypes.SELECT });
  });

  // GET /api/kampanya/komisyon-oranlari/:kanalId/:kategoriId
  fastify.get('/komisyon-oranlari/:kanalId/:kategoriId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanalId, kategoriId } = request.params;
    return await sequelize.query(`
      SELECT DISTINCT komisyon_orani * 100 as oran 
      FROM kanal_komisyon_kademeleri 
      WHERE kanal_id = :kanalId AND kategori_id = :kategoriId
      ORDER BY oran DESC
    `, { replacements: { kanalId, kategoriId }, type: sequelize.QueryTypes.SELECT });
  });

  // POST /api/kampanya/onay — Save a campaign decision to kampanya_planlari
  fastify.post('/onay', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanalId, kategoriId, komisyonOrani, ortalamaKar } = request.body;
    if (!kanalId || !kategoriId || !komisyonOrani) {
      return reply.code(400).send({ error: 'kanalId, kategoriId ve komisyonOrani zorunludur.' });
    }

    const today = new Date();
    const bitisDate = new Date(today);
    bitisDate.setMonth(bitisDate.getMonth() + 1);

    await sequelize.query(`
      INSERT INTO kampanya_planlari (kanal_id, kampanya_adi, baslangic_tarihi, bitis_tarihi, hedef_indirim_orani, hedef_karlilik)
      VALUES (:kanalId, :ad, :baslangic, :bitis, :indirim, :kar)
    `, {
      replacements: {
        kanalId,
        ad: `Komisyon Kampanyası - Kategori ${kategoriId} - %${komisyonOrani}`,
        baslangic: today.toISOString().split('T')[0],
        bitis: bitisDate.toISOString().split('T')[0],
        indirim: parseFloat(komisyonOrani) / 100,
        kar: parseFloat(ortalamaKar || 0) / 100,
      }
    });

    return { mesaj: 'Kampanya başarıyla kaydedildi.' };
  });

  fastify.post('/dosya-isle', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });
    }

    const buffer = await file.toBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((name) => normalizeHeader(name).includes('kampanya')) || workbook.SheetNames[0];

    if (!sheetName) {
      return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun sayfa bulunamadi.' });
    }

    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!matrix.length || matrix.length < 2) {
      return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });
    }

    const headers = matrix[0].map((header) => String(header || '').trim());
    const outputHeaders = [...headers, 'chosen_price', 'chosen_kar_orani', 'chosen_kar_tutari', 'chosen_source'];

    const outputRows = matrix.slice(1).map((values) => {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });

      const normalizedRow = {};
      Object.keys(row).forEach((key) => {
        normalizedRow[normalizeHeader(key)] = row[key];
      });

      const best = pickBestPrice(normalizedRow);

      return {
        ...row,
        chosen_price: best.chosenPrice ?? '',
        chosen_kar_orani: best.chosenKarOrani ?? '',
        chosen_kar_tutari: best.chosenKarTutar ?? '',
        chosen_source: best.chosenSource,
      };
    });

    const outputSheet = XLSX.utils.json_to_sheet(outputRows, { header: outputHeaders });
    const outputWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outputWorkbook, outputSheet, sheetName);

    const outputBuffer = XLSX.write(outputWorkbook, { bookType: 'xlsx', type: 'buffer' });
    const baseName = file.filename ? String(file.filename).replace(/\.[^.]+$/, '') : 'kampanya_planlama';

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${baseName}_selected.xlsx"`)
      .send(outputBuffer);
  });

  // GET /api/kampanya/ayarlar-analiz/:kanalId/:kategoriId/:komisyon
  fastify.get('/ayarlar-analiz/:kanalId/:kategoriId/:komisyon', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanalId, kategoriId, komisyon } = request.params;
    const komisyonOrani = parseFloat(komisyon) / 100;

    const hedefler = await sequelize.query(`
      SELECT k.kar_beklentisi, fk.min_kar 
      FROM kategoriler k 
      LEFT JOIN fiyatlandirma_kurallari fk ON fk.kategori_id = k.kategori_id AND fk.kanal_id = :kanalId
      WHERE k.kategori_id = :kategoriId LIMIT 1
    `, { replacements: { kanalId, kategoriId }, type: sequelize.QueryTypes.SELECT });
    
    const kategoriHedef = parseFloat(hedefler[0]?.kar_beklentisi) || 0.20;
    const kanalHedef = parseFloat(hedefler[0]?.min_kar) || 0.15;

    const urunler = await sequelize.query(`
      SELECT u.urun_id, u.stok_kodu as stokKodu, u.resim_url as fotograf, m.marka_adi as marka, u.maliyet, ku.pazaryeri_indirim_fiyat as guncelPYSatisFiyati
      FROM urunler u
      LEFT JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN kanal_urun ku ON u.urun_id = ku.urun_id AND ku.kanal_id = :kanalId
      WHERE u.kategori_id = :kategoriId
    `, { replacements: { kanalId, kategoriId }, type: sequelize.QueryTypes.SELECT });

    let totalKarOrani = 0;
    let count = 0;
    let ihlaller = [];

    for (const u of urunler) {
      const maliyet = parseFloat(u.maliyet) || 0;
      const pysf = parseFloat(u.guncelPYSatisFiyati) || 0;
      if (maliyet > 0 && pysf > 0) {
        const karTutar = pysf - maliyet - (pysf * komisyonOrani);
        const karOran = karTutar / maliyet;
        totalKarOrani += karOran;
        count++;
        if (karOran < kategoriHedef || karOran < kanalHedef) {
          ihlaller.push({ stokKodu: u.stokKodu, fotograf: u.fotograf || '', marka: u.marka || '' });
        }
      }
    }

    const ortalamaKar = count > 0 ? (totalKarOrani / count) * 100 : 0;
    return {
      ortalamaKar: Math.round(ortalamaKar),
      kanalKarHedefi: Math.round(kanalHedef * 100),
      kategoriKarHedefi: Math.round(kategoriHedef * 100),
      ihlalEdenUrunSayisi: ihlaller.length,
      ihlaller
    };
  });
};
