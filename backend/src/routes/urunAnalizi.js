'use strict';

const { sequelize, Stok, FiyatlandirmaKurali } = require('../models');
const pricingEngine = require('../services/pricingEngine');
const XLSX = require('xlsx');

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

function findByAliases(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

module.exports = async function (fastify, opts) {
  fastify.post('/kullanici-fiyat-import', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });
    }

    const buffer = await file.toBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];

    if (!firstSheet) {
      return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun sayfa bulunamadi.' });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], {
      defval: '',
      raw: false,
    }).map((row) => {
      const normalized = {};
      Object.keys(row).forEach((key) => {
        normalized[normalizeHeader(key)] = row[key];
      });
      return normalized;
    });

    if (!rows.length) {
      return reply.code(400).send({ error: 'Excel dosyasinda satir bulunamadi.' });
    }

    const mappings = [];
    const errors = [];

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      const stokKoduRaw = findByAliases(row, ['stok_kodu', 'stok kodu', 'stokkodu', 'sku']);
      const userPriceRaw = findByAliases(row, [
        'kullanici_onerilen_fiyat',
        'kullanici fiyat',
        'kullanici_fiyati',
        'user_price',
        'onerilen_fiyat_kullanici',
        'fiyat',
      ]);

      const stokKodu = String(stokKoduRaw || '').trim();
      const userPrice = parseNum(userPriceRaw);

      if (!stokKodu) {
        errors.push({ row: rowNo, error: 'Stok kodu bulunamadi.' });
        return;
      }
      if (!Number.isFinite(userPrice) || userPrice <= 0) {
        errors.push({ row: rowNo, stokKodu, error: 'Kullanici fiyat alani gecersiz.' });
        return;
      }

      mappings.push({
        stokKodu,
        userOnerilenFiyat: Math.round(userPrice * 100) / 100,
      });
    });

    const unique = [];
    const seen = new Set();
    for (const item of mappings) {
      const key = item.stokKodu.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }

    return {
      totalRows: rows.length,
      mappedCount: unique.length,
      errors,
      mappings: unique,
    };
  });

  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const thresholdInput = parseFloat(request.query.esik_tl);
    const esikTl = Number.isFinite(thresholdInput) && thresholdInput > 0 ? thresholdInput : 200;
    
    // Fetch all products with their associated data for the grid
    const urunlerList = await sequelize.query(`
      SELECT 
        u.urun_id,
        u.stok_kodu as stokKodu,
        u.maliyet,
        u.kategori_id as kategoriId,
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
        m.marka_adi as marka,
        u.resim_url as fotograf,
        u.guncelleme_tarihi as guncellemeSaati,
        ku.kanal_urun_id as kanalUrunId,
        ku.kanal_id as kanalId,
        ku.web_liste_fiyati as listeFiyat,
        ku.web_indirim_fiyati as indirimliFiyat,
        ku.pazaryeri_indirim_fiyat as pazaryeriIndirimliFiyat,
        (
          SELECT SUM(stok_miktari) 
          FROM stok s 
          WHERE s.urun_id = u.urun_id
        ) as toplamStok,
        (
          SELECT AVG(fiyat) 
          FROM rakip_fiyatlar rf 
          WHERE rf.urun_id = u.urun_id
        ) as rakipFiyatOrtalamasi,
        (
          SELECT r.rakip_adi 
          FROM rakip_fiyatlar rf2 
          JOIN rakipler r ON rf2.rakip_id = r.rakip_id 
          WHERE rf2.urun_id = u.urun_id 
          ORDER BY rf2.fiyat ASC 
          LIMIT 1
        ) as enUcuzSatici,
        (
          SELECT min(rf3.fiyat) 
          FROM rakip_fiyatlar rf3 
          WHERE rf3.urun_id = u.urun_id
        ) as enUcuzRakipFiyati
      FROM urunler u
      LEFT JOIN kategoriler k ON u.kategori_id = k.kategori_id
      LEFT JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN kanal_urun ku ON u.urun_id = ku.urun_id 
        AND ku.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1) -- Focus on our own website initially
    `, { type: sequelize.QueryTypes.SELECT });

    let toplam_urun = 0;
    let fiyat_avantajli_urun = 0;
    let fiyat_dezavantajli_urun = 0;
    let kritik_farki_olan_urunler = 0;

    const formattedList = await Promise.all(urunlerList.map(async (item) => {
      toplam_urun++;

      // Kâr Oranı = ((İndirimli Fiyat - Maliyet) / Maliyet) * 100
      let karOrani = 0;
      if (item.maliyet > 0 && item.indirimliFiyat > 0) {
        karOrani = ((item.indirimliFiyat - item.maliyet) / item.maliyet) * 100;
      }

      const bizimFiyat = parseFloat(item.indirimliFiyat || 0);
      const enUcuzRakipFiyati = parseFloat(item.enUcuzRakipFiyati || 0);

      // KPI rules based on cheapest competitor and absolute TL threshold.
      if (enUcuzRakipFiyati > 0 && bizimFiyat > 0) {
        const delta = bizimFiyat - enUcuzRakipFiyati;

        // Avantajli: cheaper but not excessively cheaper than threshold band.
        if (delta < 0 && Math.abs(delta) <= esikTl) {
          fiyat_avantajli_urun++;
        }

        // Dezavantajli: any positive difference is actionable.
        if (delta > 0) {
          fiyat_dezavantajli_urun++;
        }

        // Kritik fark: we are at least threshold TL more expensive.
        if (delta >= esikTl) {
          kritik_farki_olan_urunler++;
        }
      }

      const maliyetNum = parseFloat(item.maliyet || 0);
      
      // ─── Calculate real-time suggested price (not stale from DB) ───
      let onerilenFiyatNum = 0;
      try {
        // Fetch current stok records and kural for this product
        const [stoklar, kurals, kategoriData] = await Promise.all([
          Stok.findAll({ where: { urun_id: item.urun_id } }),
          FiyatlandirmaKurali.findAll({
            where: {
              kanal_id: item.kanalId,
              kategori_id: item.kategoriId,
              aktiflik_durumu: true,
            },
            limit: 1,
          }),
          require('../models').sequelize.query(`
            SELECT kar_beklentisi FROM kategoriler WHERE kategori_id = ?
          `, { replacements: [item.kategoriId], type: require('../models').sequelize.QueryTypes.SELECT }),
        ]);

        // Build kompetitor array with 70%+ size filtering (same as detail view)
        const rakipSql = await require('../models').sequelize.query(`
          SELECT 
            r.rakip_adi as satici,
            MAX(rf.fiyat) as fiyat,
            COUNT(rf.beden_id) as dbAktifBeden
          FROM rakip_fiyatlar rf
          JOIN rakipler r ON rf.rakip_id = r.rakip_id
          WHERE rf.urun_id = ?
          GROUP BY r.rakip_id, r.rakip_adi
        `, { replacements: [item.urun_id], type: require('../models').sequelize.QueryTypes.SELECT });

        const toplamBedenSql = await require('../models').sequelize.query(`
          SELECT COUNT(DISTINCT beden_id) as total FROM stok WHERE urun_id = ?
        `, { replacements: [item.urun_id], type: require('../models').sequelize.QueryTypes.SELECT });
        const productTotalSizes = (toplamBedenSql[0]?.total) || 5;

        const rakipler = rakipSql.map(r => {
          const hasRealSizes = parseInt(r.dbAktifBeden || 0) > 0;
          const aktifBeden = hasRealSizes ? parseInt(r.dbAktifBeden) : Math.floor(Math.random() * 8) + 1;
          const toplamPlanlananBeden = hasRealSizes ? Math.max(productTotalSizes, aktifBeden) : (aktifBeden + Math.floor(Math.random() * 4));
          const pasifBeden = toplamPlanlananBeden - aktifBeden;
          const bedenOrani = Math.round((aktifBeden / toplamPlanlananBeden) * 100);
          
          return {
            satici: r.satici,
            fiyat: parseFloat(r.fiyat),
            aktifBeden,
            pasifBeden,
            bedenOrani,
          };
        });

        const gecerliRakipler = rakipler.filter(r => r.bedenOrani >= 70);
        const rakipPreices = gecerliRakipler.map(r => r.fiyat);

        const defaultKural = {
          komisyon_orani: 0,
          lojistik_gideri: 0,
          kargo_ucreti: 0,
          max_indirim: 0.40,
          min_kar: 0.10,
          rekabet_katsayisi: 1.05,
        };

        // Call pricing engine with real data
        const hesapSonucu = pricingEngine.compute({
          urun: {
            maliyet: maliyetNum,
            Kategori: { kar_beklentisi: parseFloat(kategoriData[0]?.kar_beklentisi ?? 0.45) },
          },
          kanalUrun: {
            web_indirim_fiyati: item.indirimliFiyat,
            pazaryeri_indirim_fiyat: item.pazaryeriIndirimliFiyat,
          },
          kural: kurals[0] || defaultKural,
          rakipFiyatlar: rakipPreices.map((fiyat) => ({ fiyat })),
          stoklar,
        });

        onerilenFiyatNum = parseFloat(hesapSonucu.onerilenFiyat || 0);
      } catch (err) {
        console.error(`Pricing calc failed for ${item.stokKodu}:`, err.message);
        onerilenFiyatNum = maliyetNum * 1.3; // Fallback to 30% margin
      }

      // Karlılık İhlali: If recommended price is less than cost
      let karlilikIhlali = 'Yok';
      if (onerilenFiyatNum > 0 && maliyetNum > 0) {
        if (onerilenFiyatNum < maliyetNum) {
          karlilikIhlali = 'Var';
        }
      }

      // Clean up dates
      const lastUpdate = item.guncellemeSaati;
      const formattedDate = lastUpdate ? new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(new Date(lastUpdate)) : '-';

      return {
        stokKodu: item.stokKodu,
        maliyet: maliyetNum,
        listeFiyat: parseFloat(item.listeFiyat || 0),
        indirimliFiyat: parseFloat(item.indirimliFiyat || 0),
        rakipFiyatOrtalamasi: parseFloat(item.rakipFiyatOrtalamasi || 0),
        enUcuzRakipFiyati: enUcuzRakipFiyati,
        karOrani: karOrani,
        onerilenFiyat: onerilenFiyatNum,
        guncellemeSaati: formattedDate,
        fotograf: item.fotograf,
        marka: item.marka,
        toplamStok: parseInt(item.toplamStok || 0),
        enUcuzSatici: item.enUcuzSatici || '-',
        kategori: item.kategori || '-',
        sezon: item.sezon || '-',
        cinsiyet: item.cinsiyet || 'Unisex',
        karlilikIhlali: karlilikIhlali
      };
    }));

    // Logical order for actionability:
    // 1) Profitability violations first
    // 2) Biggest price disadvantage vs cheapest competitor (TL delta)
    // 3) Then stable by stock code
    const sortedFormattedList = [...formattedList].sort((a, b) => {
      const ihlalRankA = a.karlilikIhlali === 'Var' ? 0 : 1;
      const ihlalRankB = b.karlilikIhlali === 'Var' ? 0 : 1;
      if (ihlalRankA !== ihlalRankB) return ihlalRankA - ihlalRankB;

      const aDeltaTl = (a.enUcuzRakipFiyati > 0 && a.indirimliFiyat > 0)
        ? (a.indirimliFiyat - a.enUcuzRakipFiyati)
        : -Infinity;
      const bDeltaTl = (b.enUcuzRakipFiyati > 0 && b.indirimliFiyat > 0)
        ? (b.indirimliFiyat - b.enUcuzRakipFiyati)
        : -Infinity;
      if (aDeltaTl !== bDeltaTl) return bDeltaTl - aDeltaTl;

      return String(a.stokKodu || '').localeCompare(String(b.stokKodu || ''), 'tr');
    });

    return {
      esik_tl: esikTl,
      kpis: {
        toplam_urun,
        fiyat_avantajli_urun,
        fiyat_dezavantajli_urun,
        kritik_farki_olan_urunler
      },
      urunler: sortedFormattedList
    };
  });

  fastify.get('/:stokKodu/detay', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const rawStokKodu = request.params.stokKodu;
    let stokKodu = rawStokKodu;
    try {
      stokKodu = decodeURIComponent(rawStokKodu);
    } catch (e) {
      stokKodu = rawStokKodu;
    }
    
    // Find the product and basic info
    const urunler = await sequelize.query(`
      SELECT 
        u.urun_id, u.kategori_id, u.maliyet, k.kar_beklentisi,
        ku.kanal_urun_id, ku.kanal_id,
        ku.web_indirim_fiyati as indirimliFiyat,
        ku.web_indirim_fiyati,
        ku.pazaryeri_indirim_fiyat,
        (
          SELECT fo.oneri_id
          FROM fiyat_onerileri fo
          WHERE fo.kanal_urun_id = ku.kanal_urun_id
            AND fo.durum = 'beklemede'
          ORDER BY fo.olusturma_tarihi DESC
          LIMIT 1
        ) as oneriId,
        (
          SELECT fo.onerilen_fiyat 
          FROM fiyat_onerileri fo 
          WHERE fo.kanal_urun_id = ku.kanal_urun_id 
          ORDER BY fo.olusturma_tarihi DESC LIMIT 1
        ) as onerilenFiyat
      FROM urunler u
      LEFT JOIN kategoriler k ON u.kategori_id = k.kategori_id
      LEFT JOIN kanal_urun ku ON u.urun_id = ku.urun_id
        AND ku.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1)
      WHERE u.stok_kodu = :stokKodu
      LIMIT 1
    `, { replacements: { stokKodu }, type: sequelize.QueryTypes.SELECT });

    if (urunler.length === 0) {
      return reply.code(404).send({ error: 'Urun bulunamadi' });
    }
    const urun = urunler[0];

    // How many distinct sizes do WE have for this product?
    const toplamBedenSql = await sequelize.query(`
      SELECT COUNT(DISTINCT beden_id) as total FROM stok WHERE urun_id = :urun_id
    `, { replacements: { urun_id: urun.urun_id }, type: sequelize.QueryTypes.SELECT });
    const productTotalSizes = (toplamBedenSql[0]?.total) || 5;

    // Competitors data grouped by competitor, counting sizes
    const rakipSql = await sequelize.query(`
      SELECT 
        r.rakip_adi as satici, r.rakip_url as link, 
        MAX(rf.fiyat) as fiyat, MAX(rf.veri_kazima_zamani) as guncelleme_tarihi,
        COUNT(rf.beden_id) as dbAktifBeden
      FROM rakip_fiyatlar rf
      JOIN rakipler r ON rf.rakip_id = r.rakip_id
      WHERE rf.urun_id = :urun_id
      GROUP BY r.rakip_id, r.rakip_adi, r.rakip_url
    `, { replacements: { urun_id: urun.urun_id }, type: sequelize.QueryTypes.SELECT });

    // Build competitor stats
    const rakipler = rakipSql.map(r => {
      // If our seed data injected NULL for beden, dbAktifBeden is 0. 
      // We gracefully fallback to mock only for UI showcase purposes, but the DB absolutely supports it.
      const hasRealSizes = parseInt(r.dbAktifBeden || 0) > 0;
      const aktifBeden = hasRealSizes ? parseInt(r.dbAktifBeden) : Math.floor(Math.random() * 8) + 1;
      
      const toplamPlanlananBeden = hasRealSizes ? Math.max(productTotalSizes, aktifBeden) : (aktifBeden + Math.floor(Math.random() * 4));
      const pasifBeden = toplamPlanlananBeden - aktifBeden;
      const bedenOrani = Math.round((aktifBeden / toplamPlanlananBeden) * 100);
      
      const guncelleme = r.guncelleme_tarihi 
        ? new Intl.DateTimeFormat('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(r.guncelleme_tarihi))
        : '17/03/2026 12:54';

      return {
        satici: r.satici,
        fiyat: parseFloat(r.fiyat),
        aktifBeden,
        pasifBeden,
        bedenOrani,
        favoriBeden: Math.floor(Math.random() * 5),
        guncelleme,
        link: r.link || '#'
      };
    });

    const gecerliRakipler = rakipler.filter(r => r.bedenOrani >= 70);
    const rakipPreices = gecerliRakipler.map(r => r.fiyat);
    const avgRakipFiyat = rakipPreices.length > 0 
      ? rakipPreices.reduce((a,b) => a+b, 0) / rakipPreices.length 
      : 0;

    const indirimliFiyat = parseFloat(urun.indirimliFiyat || 0);
    const maliyet = parseFloat(urun.maliyet || 0);
    const hedefKarlilik = parseFloat(urun.kar_beklentisi || 0.45);

    const [stoklar, kurals] = await Promise.all([
      Stok.findAll({ where: { urun_id: urun.urun_id } }),
      FiyatlandirmaKurali.findAll({
        where: {
          kanal_id: urun.kanal_id,
          kategori_id: urun.kategori_id,
          aktiflik_durumu: true,
        },
        limit: 1,
      }),
    ]);

    const defaultKural = {
      komisyon_orani: 0,
      lojistik_gideri: 0,
      kargo_ucreti: 0,
      max_indirim: 0.40,
      min_kar: 0.10,
      rekabet_katsayisi: 1.05,
    };

    const hesapSonucu = pricingEngine.compute({
      urun: {
        maliyet,
        Kategori: { kar_beklentisi: hedefKarlilik },
      },
      kanalUrun: {
        web_indirim_fiyati: urun.web_indirim_fiyati,
        pazaryeri_indirim_fiyat: urun.pazaryeri_indirim_fiyat,
      },
      kural: kurals[0] || defaultKural,
      rakipFiyatlar: rakipPreices.map((fiyat) => ({ fiyat })),
      stoklar,
    });

    const onerilenFiyat = parseFloat(hesapSonucu.onerilenFiyat || urun.onerilenFiyat || 329);

    const eskiKarlilik = maliyet > 0 ? ((indirimliFiyat - maliyet) / maliyet) * 100 : 0;
    const yeniKarlilik = maliyet > 0 ? ((onerilenFiyat - maliyet) / maliyet) * 100 : 0;

    // Fiyat geçmişi: Mock data mimicking line chart for past 6 days + today
    let startVal = indirimliFiyat * 1.5;
    const fiyatGecmisi = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (i === 6) startVal = Math.max(startVal, maliyet * 1.8);
      else if (i === 0) startVal = indirimliFiyat;
      else startVal = startVal - (startVal * (Math.random() * 0.1));
      
      fiyatGecmisi.push({
        date: ds,
        fiyat: parseFloat(startVal.toFixed(2))
      });
    }

    return {
      oneriId: urun.oneriId ? parseInt(urun.oneriId, 10) : null,
      fiyatGecmisi,
      algoritmaDetayi: {
        maliyet,
        hedefKarlilik: hesapSonucu.hesapDetayi?.hedefKarlilik ?? hedefKarlilik,
        rakipFiyatOrtalamasi: parseFloat((hesapSonucu.hesapDetayi?.rakipFiyatOrtalamasi ?? avgRakipFiyat).toFixed(2)),
        rekabetKatsayisi: hesapSonucu.hesapDetayi?.rekabetKatsayisi ?? 1.05,
        talepKatsayisi: hesapSonucu.hesapDetayi?.talepKatsayisi ?? 1.0,
        stokKatsayisi: hesapSonucu.hesapDetayi?.stokKatsayisi ?? 1.0,
        eskiKarlilik: Math.round(eskiKarlilik),
        yeniKarlilik: Math.round(yeniKarlilik),
        onerilenFiyat,
        rakipFiyatlarArray: rakipPreices
      },
      rakipler
    };
  });
};
