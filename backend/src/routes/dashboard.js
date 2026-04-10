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
    // 1. Rakip Fiyat Farkı Yüksek Ürünler (>20% fark) — web channel only
    const rakipFarkiList = await sequelize.query(`
      SELECT 
        u.urun_id, u.resim_url, u.stok_kodu, m.marka_adi, 
        rf.fiyat as en_ucuz_rakip, 
        ku.web_liste_fiyati as bizim_fiyat,
        ((ku.web_liste_fiyati - rf.fiyat) / rf.fiyat) * 100 as fark_yuzdesi
      FROM urunler u
      JOIN marka m ON u.marka_id = m.marka_id
      JOIN kanal_urun ku ON u.urun_id = ku.urun_id AND ku.kanal_id = (SELECT kanal_id FROM kanallar WHERE kanal_sahibi = 1 LIMIT 1)
      JOIN (
        SELECT urun_id, MIN(fiyat) as fiyat
        FROM rakip_fiyatlar
        GROUP BY urun_id
      ) rf ON u.urun_id = rf.urun_id
      WHERE ku.web_liste_fiyati > rf.fiyat
      HAVING fark_yuzdesi >= 20
      ORDER BY fark_yuzdesi DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    // 2. Stok Riski Olan Ürünler — total stock per product
    const stokRiskiList = await sequelize.query(`
      SELECT 
        u.urun_id, u.resim_url, u.stok_kodu, m.marka_adi,
        SUM(s.stok_miktari) as stok
      FROM urunler u
      JOIN marka m ON u.marka_id = m.marka_id
      JOIN stok s ON u.urun_id = s.urun_id
      GROUP BY u.urun_id, u.resim_url, u.stok_kodu, m.marka_adi
      HAVING stok <= 15 OR stok >= 200
      ORDER BY stok ASC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    // 3. Fiyat Alarmı — all open alerts
    const fiyatAlarmiList = await sequelize.query(`
      SELECT 
        u.urun_id, u.resim_url, u.stok_kodu, m.marka_adi,
        a.mesaj, a.alert_tipi
      FROM alertler a
      JOIN kanal_urun ku ON a.kanal_urun_id = ku.kanal_urun_id
      JOIN urunler u ON ku.urun_id = u.urun_id
      JOIN marka m ON u.marka_id = m.marka_id
      WHERE a.durum = 'acik'
      ORDER BY a.olusturma_tarihi DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    const parsedFiyatAlarmiList = fiyatAlarmiList.map(item => {
      const match = item.mesaj.match(/(%?)(\d+)/);
      const dusus = match ? parseInt(match[2]) : 15;
      return { ...item, dusus_yuzdesi: dusus };
    }).sort((a, b) => b.dusus_yuzdesi - a.dusus_yuzdesi);

    return {
      rakip_fiyat_farki: rakipFarkiList,
      stok_riski: stokRiskiList,
      fiyat_alarmi: parsedFiyatAlarmiList
    };
  });

  // GET /api/dashboard/kanallar — To populate the Channel Slicer
  fastify.get('/kanallar', { preHandler: [fastify.authenticate] }, async () => {
    return Kanal.findAll({ attributes: ['kanal_id', 'kanal_adi'] });
  });
};
