'use strict';
const { Op } = require('sequelize');
const { sequelize, Satis, Alert, FiyatOnerisi, Kanal, KanalUrun } = require('../models');

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

module.exports = async function dashboardRoutes(fastify) {
  // GET /api/dashboard?year=2024&channels=1,2,3
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const year = request.query.year ? parseInt(request.query.year) : new Date().getFullYear();
    const channelsParam = request.query.channels;
    const channelIds = channelsParam ? channelsParam.split(',').map(Number).filter(id => !isNaN(id)) : [];

    const channelFilter = channelIds.length > 0 ? { '$KanalUrun.kanal_id$': { [Op.in]: channelIds } } : {};

    // 1. Fiyat Değişim Öneri count
    const bekleyenOneriSayisi = await FiyatOnerisi.count({
      where: { durum: 'beklemede', ...channelFilter },
      include: [{ model: KanalUrun, attributes: [] }]
    });

    // 2. Aktif Uyarı count
    const acikAlertSayisi = await Alert.count({
      where: { durum: 'acik', ...channelFilter },
      include: [{ model: KanalUrun, attributes: [] }]
    });

    // 3. Monthly target (sum across active rules for selected channels)
    const channelInSQL = channelIds.length > 0 ? `AND kanal_id IN (${channelIds.join(',')})` : '';
    const targetQuery = await sequelize.query(`
      SELECT SUM(aylik_satis_hedefi) as total_hedef
      FROM fiyatlandirma_kurallari
      WHERE aktiflik_durumu = 1 ${channelInSQL}
    `, { type: sequelize.QueryTypes.SELECT });
    const monthlyTarget = parseFloat(targetQuery[0]?.total_hedef || 0);

    // 4. Sales by Month AND Channel
    const salesRows = await sequelize.query(`
      SELECT MONTH(s.satis_tarihi) as ay_no,
             ku.kanal_id,
             SUM(s.satis_miktari * s.birim_fiyat) as ciro,
             SUM(s.satis_miktari * s.maliyet_snapshot) as maliyet
      FROM satislar s
      JOIN kanal_urun ku ON s.kanal_urun_id = ku.kanal_urun_id
      WHERE YEAR(s.satis_tarihi) = :year ${channelInSQL}
      GROUP BY MONTH(s.satis_tarihi), ku.kanal_id
    `, { replacements: { year }, type: sequelize.QueryTypes.SELECT });

    // Fetch channel names
    const kanalRows = await sequelize.query(
      channelIds.length > 0
        ? `SELECT kanal_id, kanal_adi FROM kanallar WHERE kanal_id IN (${channelIds.join(',')})`
        : `SELECT kanal_id, kanal_adi FROM kanallar`,
      { type: sequelize.QueryTypes.SELECT }
    );

    const kanalAdlari = {};
    kanalRows.forEach(k => { kanalAdlari[k.kanal_id] = k.kanal_adi; });

    // Build per-channel per-month data maps
    const channelDataMap = {}; // { kanalId: { monthNo: ciro } }
    let totalCiro = 0;
    let totalMaliyet = 0;

    salesRows.forEach(row => {
      const c = parseFloat(row.ciro || 0);
      const m = parseFloat(row.maliyet || 0);
      totalCiro += c;
      totalMaliyet += m;
      if (!channelDataMap[row.kanal_id]) channelDataMap[row.kanal_id] = {};
      channelDataMap[row.kanal_id][row.ay_no] = c;
    });

    const activeChannelIds = Object.keys(channelDataMap).map(Number);

    // 5. Karlılık Oranı
    const karlilikOrani = totalCiro > 0 ? (totalCiro - totalMaliyet) / totalCiro : 0;

    // 6. Ciro hedef gerçekleşme
    const hedefGerceklesmeOrani = monthlyTarget > 0
      ? Math.min((totalCiro / 12) / monthlyTarget, 9.99)
      : 0;

    // 7. Graph Data — one dataKey per channel
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const grafik_verisi = AYLAR.map((ayIsmi, index) => {
      const ayNo = index + 1;
      const isPast = (year < currentYear) || (year === currentYear && ayNo < currentMonth);
      const isBoundary = (year === currentYear && ayNo === currentMonth - 1);
      const isFuture = (year > currentYear) || (year === currentYear && ayNo >= currentMonth);

      const point = { ay: ayIsmi, hedef: monthlyTarget };

      // One actual line per channel
      activeChannelIds.forEach(kId => {
        const val = channelDataMap[kId]?.[ayNo] || 0;
        point[`kanal_${kId}`] = (isPast || isBoundary) ? val : null;
      });

      // Single forecast line
      let tahmin = null, tahmin_alt = null, tahmin_ust = null;
      if (isFuture || isBoundary) {
        const base = monthlyTarget > 0 ? monthlyTarget : 5000;
        tahmin = Math.round(base * (0.925 + Math.random() * 0.15));
        tahmin_ust = Math.round(tahmin * 1.20);
        tahmin_alt = Math.round(tahmin * 0.80);
        if (isBoundary) {
          const total = activeChannelIds.reduce((s, kId) => s + (channelDataMap[kId]?.[ayNo] || 0), 0);
          tahmin = total; tahmin_ust = total; tahmin_alt = total;
        }
      }
      point.tahmin = tahmin;
      point.tahmin_araligi = tahmin_alt !== null ? [tahmin_alt, tahmin_ust] : null;

      return point;
    });

    return {
      karlilik_orani: karlilikOrani,
      fiyat_degisim_oneri: bekleyenOneriSayisi,
      aylik_ciro_hedefi_gerceklesmis: hedefGerceklesmeOrani,
      aktif_uyari: acikAlertSayisi,
      grafik_verisi,
      kanal_adlari: kanalAdlari,
      aktif_kanal_ids: activeChannelIds,
    };
  });

  // GET /api/dashboard/uyarilar-tablosu — For the 3 UI Tables at the bottom
  fastify.get('/uyarilar-tablosu', { preHandler: [fastify.authenticate] }, async (request) => {
    const channelsParam = request.query.channels;
    const channelIds = channelsParam ? channelsParam.split(',').map(Number).filter(id => !isNaN(id)) : [];
    const channelInSQL = channelIds.length > 0 ? `AND ku.kanal_id IN (${channelIds.join(',')})` : '';

    const periodRaw = String(request.query.stok_period || '30');
    const allowedPeriods = new Set(['7', '30', '90', '365']);
    const periodDays = allowedPeriods.has(periodRaw) ? parseInt(periodRaw, 10) : 30;

    const dropThresholdRaw = parseFloat(request.query.drop_threshold || '10');
    const dropThreshold = Number.isFinite(dropThresholdRaw) && dropThresholdRaw > 0 ? dropThresholdRaw : 10;

    // 1. Rakip Fiyat Farkı Yüksek Ürünler (>20% fark) — web channel only
    const rakipFarkiList = await sequelize.query(`
      WITH latest_rakip AS (
        SELECT
          rf.urun_id,
          rf.rakip_id,
          rf.kanal_id,
          rf.beden_id,
          rf.fiyat,
          ROW_NUMBER() OVER (
            PARTITION BY rf.urun_id, rf.rakip_id, rf.kanal_id, COALESCE(rf.beden_id, -1)
            ORDER BY rf.veri_kazima_zamani DESC, rf.rakip_fiyat_id DESC
          ) as rn
        FROM rakip_fiyatlar rf
      ), min_latest AS (
        SELECT urun_id, MIN(fiyat) as fiyat
        FROM latest_rakip
        WHERE rn = 1
        GROUP BY urun_id
      )
      SELECT 
        u.urun_id, u.resim_url, u.stok_kodu, m.marka_adi, 
        ml.fiyat as en_ucuz_rakip, 
        ku.web_liste_fiyati as bizim_fiyat,
        ((ku.web_liste_fiyati - ml.fiyat) / ml.fiyat) * 100 as fark_yuzdesi
      FROM urunler u
      JOIN marka m ON u.marka_id = m.marka_id
      JOIN kanal_urun ku ON u.urun_id = ku.urun_id AND ku.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1)
      JOIN min_latest ml ON u.urun_id = ml.urun_id
      WHERE ku.web_liste_fiyati > ml.fiyat
      HAVING fark_yuzdesi >= 20
      ORDER BY fark_yuzdesi DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // 2. Kritik Düşük Stok — coverage <= 30 days based on sales velocity
    const stokKritikDusukList = await sequelize.query(`
      SELECT 
        u.urun_id,
        u.resim_url,
        u.stok_kodu,
        m.marka_adi,
        COALESCE(st.toplam_stok, 0) as stok,
        COALESCE(sr.satilan_adet, 0) as satilan_adet,
        ROUND(COALESCE(sr.satilan_adet, 0) / :periodDays, 2) as devir_hizi_gunluk,
        ROUND((COALESCE(st.toplam_stok, 0) * :periodDays) / NULLIF(COALESCE(sr.satilan_adet, 0), 0), 1) as tukenme_gunu,
        ls.son_satis_tarihi
      FROM urunler u
      JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN (
        SELECT urun_id, SUM(stok_miktari) as toplam_stok
        FROM stok
        GROUP BY urun_id
      ) st ON st.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, SUM(s.satis_miktari) as satilan_adet
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        WHERE s.satis_tarihi >= DATE_SUB(NOW(), INTERVAL :periodDays DAY) ${channelInSQL}
        GROUP BY ku.urun_id
      ) sr ON sr.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, MAX(s.satis_tarihi) as son_satis_tarihi
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        ${channelIds.length > 0 ? `WHERE ku.kanal_id IN (${channelIds.join(',')})` : ''}
        GROUP BY ku.urun_id
      ) ls ON ls.urun_id = u.urun_id
      WHERE COALESCE(sr.satilan_adet, 0) > 0
        AND ((COALESCE(st.toplam_stok, 0) * :periodDays) / NULLIF(COALESCE(sr.satilan_adet, 0), 0)) <= 30
      ORDER BY tukenme_gunu ASC, devir_hizi_gunluk DESC
    `, {
      replacements: { periodDays },
      type: sequelize.QueryTypes.SELECT
    });

    // 3. Fazla Stok — coverage >= 90 days or no sales in selected period
    const stokFazlasiList = await sequelize.query(`
      SELECT 
        u.urun_id,
        u.resim_url,
        u.stok_kodu,
        m.marka_adi,
        COALESCE(st.toplam_stok, 0) as stok,
        COALESCE(sr.satilan_adet, 0) as satilan_adet,
        ROUND(COALESCE(sr.satilan_adet, 0) / :periodDays, 2) as devir_hizi_gunluk,
        ROUND((COALESCE(st.toplam_stok, 0) * :periodDays) / NULLIF(COALESCE(sr.satilan_adet, 0), 0), 1) as tukenme_gunu,
        ls.son_satis_tarihi
      FROM urunler u
      JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN (
        SELECT urun_id, SUM(stok_miktari) as toplam_stok
        FROM stok
        GROUP BY urun_id
      ) st ON st.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, SUM(s.satis_miktari) as satilan_adet
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        WHERE s.satis_tarihi >= DATE_SUB(NOW(), INTERVAL :periodDays DAY) ${channelInSQL}
        GROUP BY ku.urun_id
      ) sr ON sr.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, MAX(s.satis_tarihi) as son_satis_tarihi
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        ${channelIds.length > 0 ? `WHERE ku.kanal_id IN (${channelIds.join(',')})` : ''}
        GROUP BY ku.urun_id
      ) ls ON ls.urun_id = u.urun_id
      WHERE COALESCE(st.toplam_stok, 0) > 0
        AND (
          COALESCE(sr.satilan_adet, 0) = 0
          OR ((COALESCE(st.toplam_stok, 0) * :periodDays) / NULLIF(COALESCE(sr.satilan_adet, 0), 0)) >= 90
        )
      ORDER BY (COALESCE(sr.satilan_adet, 0) = 0) DESC, tukenme_gunu DESC, stok DESC
    `, {
      replacements: { periodDays },
      type: sequelize.QueryTypes.SELECT
    });

    // 4. Fiyat Alarmı — computed from structured competitor history
    const fiyatAlarmiList = await sequelize.query(`
      WITH latest_competitor_rows AS (
        SELECT
          rf.rakip_fiyat_id,
          rf.urun_id,
          rf.rakip_id,
          rf.kanal_id,
          rf.beden_id,
          rf.fiyat,
          rf.veri_kazima_zamani,
          ROW_NUMBER() OVER (
            PARTITION BY rf.urun_id, rf.rakip_id, rf.kanal_id, COALESCE(rf.beden_id, -1)
            ORDER BY rf.veri_kazima_zamani DESC, rf.rakip_fiyat_id DESC
          ) AS latest_rn
        FROM rakip_fiyatlar rf
      ), latest_key_prices AS (
        SELECT *
        FROM latest_competitor_rows
        WHERE latest_rn = 1
      ), cheapest_per_product AS (
        SELECT
          lk.*,
          ROW_NUMBER() OVER (
            PARTITION BY lk.urun_id
            ORDER BY lk.fiyat ASC, lk.rakip_id ASC, COALESCE(lk.beden_id, -1) ASC
          ) AS cheapest_rn
        FROM latest_key_prices lk
        ${channelIds.length > 0 ? `WHERE lk.kanal_id IN (${channelIds.join(',')})` : ''}
      ), cheapest_now AS (
        SELECT *
        FROM cheapest_per_product
        WHERE cheapest_rn = 1
      )
      SELECT 
        u.urun_id,
        u.resim_url,
        u.stok_kodu,
        m.marka_adi,
        r.rakip_adi as en_ucuz_rakip,
        (
          SELECT rf_prev.fiyat
          FROM rakip_fiyatlar rf_prev
          WHERE rf_prev.urun_id = cn.urun_id
            AND rf_prev.rakip_id = cn.rakip_id
            AND rf_prev.kanal_id = cn.kanal_id
            AND (rf_prev.beden_id <=> cn.beden_id)
            AND (
              rf_prev.veri_kazima_zamani < cn.veri_kazima_zamani
              OR (rf_prev.veri_kazima_zamani = cn.veri_kazima_zamani AND rf_prev.rakip_fiyat_id < cn.rakip_fiyat_id)
            )
          ORDER BY rf_prev.veri_kazima_zamani DESC, rf_prev.rakip_fiyat_id DESC
          LIMIT 1
        ) as eski_rakip_fiyati,
        cn.fiyat as yeni_rakip_fiyati,
        web_ku.web_liste_fiyati as bizim_fiyat,
        ROUND((
          ((
            SELECT rf_prev.fiyat
            FROM rakip_fiyatlar rf_prev
            WHERE rf_prev.urun_id = cn.urun_id
              AND rf_prev.rakip_id = cn.rakip_id
              AND rf_prev.kanal_id = cn.kanal_id
              AND (rf_prev.beden_id <=> cn.beden_id)
              AND (
                rf_prev.veri_kazima_zamani < cn.veri_kazima_zamani
                OR (rf_prev.veri_kazima_zamani = cn.veri_kazima_zamani AND rf_prev.rakip_fiyat_id < cn.rakip_fiyat_id)
              )
            ORDER BY rf_prev.veri_kazima_zamani DESC, rf_prev.rakip_fiyat_id DESC
            LIMIT 1
          ) - cn.fiyat
        ) /
          NULLIF((
            SELECT rf_prev.fiyat
            FROM rakip_fiyatlar rf_prev
            WHERE rf_prev.urun_id = cn.urun_id
              AND rf_prev.rakip_id = cn.rakip_id
              AND rf_prev.kanal_id = cn.kanal_id
              AND (rf_prev.beden_id <=> cn.beden_id)
              AND (
                rf_prev.veri_kazima_zamani < cn.veri_kazima_zamani
                OR (rf_prev.veri_kazima_zamani = cn.veri_kazima_zamani AND rf_prev.rakip_fiyat_id < cn.rakip_fiyat_id)
              )
            ORDER BY rf_prev.veri_kazima_zamani DESC, rf_prev.rakip_fiyat_id DESC
            LIMIT 1
          ), 0)
        ) * 100, 2) as dusus_yuzdesi,
        cn.veri_kazima_zamani as guncelleme_tarihi
      FROM cheapest_now cn
      JOIN urunler u ON u.urun_id = cn.urun_id
      JOIN marka m ON u.marka_id = m.marka_id
      JOIN rakipler r ON r.rakip_id = cn.rakip_id
      JOIN kanal_urun web_ku ON web_ku.urun_id = u.urun_id
        AND web_ku.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1)
      WHERE (
        SELECT rf_prev.fiyat
        FROM rakip_fiyatlar rf_prev
        WHERE rf_prev.urun_id = cn.urun_id
          AND rf_prev.rakip_id = cn.rakip_id
          AND rf_prev.kanal_id = cn.kanal_id
          AND (rf_prev.beden_id <=> cn.beden_id)
          AND (
            rf_prev.veri_kazima_zamani < cn.veri_kazima_zamani
            OR (rf_prev.veri_kazima_zamani = cn.veri_kazima_zamani AND rf_prev.rakip_fiyat_id < cn.rakip_fiyat_id)
          )
        ORDER BY rf_prev.veri_kazima_zamani DESC, rf_prev.rakip_fiyat_id DESC
        LIMIT 1
      ) > cn.fiyat
      HAVING dusus_yuzdesi >= :dropThreshold
      ORDER BY dusus_yuzdesi DESC, cn.veri_kazima_zamani DESC
    `, {
      replacements: { dropThreshold },
      type: sequelize.QueryTypes.SELECT
    });

    return {
      rakip_fiyat_farki: rakipFarkiList,
      stok_kritik_dusuk: stokKritikDusukList,
      stok_fazlasi: stokFazlasiList,
      fiyat_alarmi: fiyatAlarmiList
    };
  });

  // GET /api/dashboard/kanallar — To populate the Channel Slicer
  fastify.get('/kanallar', { preHandler: [fastify.authenticate] }, async () => {
    return Kanal.findAll({ attributes: ['kanal_id', 'kanal_adi'] });
  });
};
