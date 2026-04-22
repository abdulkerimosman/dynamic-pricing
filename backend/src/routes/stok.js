'use strict';
const { Stok, Urun, Beden, sequelize } = require('../models');

module.exports = async function stokRoutes(fastify) {
  // GET /api/stok
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { urun_id, page = 1, limit = 30 } = request.query;
    const where = {};
    if (urun_id) where.urun_id = urun_id;

    const { count, rows } = await Stok.findAndCountAll({
      where,
      include: [
        { model: Urun,  attributes: ['urun_adi', 'resim_url', 'maliyet'] },
        { model: Beden, attributes: ['beden_adi'] },
      ],
      order:  [['urun_id', 'ASC'], ['beden_id', 'ASC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return { toplam: count, stoklar: rows };
  });

  // PUT /api/stok/:id — Update stock quantity
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [updated] = await Stok.update(
      { stok_miktari: request.body.stok_miktari, stok_katsayisi: request.body.stok_katsayisi },
      { where: { stok_id: request.params.id } }
    );
    if (!updated) return reply.code(404).send({ error: 'Stok kaydı bulunamadı.' });
    return Stok.findByPk(request.params.id, { include: [{ model: Urun }, { model: Beden }] });
  });

  // GET /api/stok/analiz
  fastify.get('/analiz', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const periodRaw = String(request.query.stok_period || '30');
    const allowedPeriods = new Set(['7', '30', '90', '365']);
    const periodDays = allowedPeriods.has(periodRaw) ? parseInt(periodRaw, 10) : 30;
    
    const dataSql = await sequelize.query(`
      SELECT 
        u.stok_kodu as stokKodu,
        u.maliyet,
        u.resim_url as fotograf,
        m.marka_adi as marka,
        kat.kategori_adi as kategori,
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
        u.guncelleme_tarihi as guncellemeSaati,
        COALESCE(st.toplam_stok, 0) as toplamStok,
        COALESCE(sr.satilan_adet, 0) as satilanAdet,
        COALESCE((SELECT COUNT(DISTINCT beden_id) FROM stok s WHERE s.urun_id = u.urun_id), 0) as toplamBeden,
        COALESCE((SELECT COUNT(DISTINCT beden_id) FROM stok s WHERE s.urun_id = u.urun_id AND s.stok_miktari > 0), 0) as aktifBeden,
        ls.son_satis_tarihi
      FROM urunler u
      LEFT JOIN marka m ON u.marka_id = m.marka_id
      LEFT JOIN kategoriler kat ON kat.kategori_id = u.kategori_id
      LEFT JOIN (
        SELECT urun_id, SUM(stok_miktari) as toplam_stok
        FROM stok
        GROUP BY urun_id
      ) st ON st.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, SUM(s.satis_miktari) as satilan_adet
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        WHERE s.satis_tarihi >= DATE_SUB(NOW(), INTERVAL :periodDays DAY)
        GROUP BY ku.urun_id
      ) sr ON sr.urun_id = u.urun_id
      LEFT JOIN (
        SELECT ku.urun_id, MAX(s.satis_tarihi) as son_satis_tarihi
        FROM satislar s
        JOIN kanal_urun ku ON ku.kanal_urun_id = s.kanal_urun_id
        GROUP BY ku.urun_id
      ) ls ON ls.urun_id = u.urun_id
    `, { replacements: { periodDays }, type: sequelize.QueryTypes.SELECT });

    let sifirStokSayisi = 0;
    let kritikStokSayisi = 0;
    let stokFazlasiSayisi = 0;
    let yuksekBedenKriklikSayisi = 0;

    const list = dataSql.map((u) => {
      const tstok = parseInt(u.toplamStok || 0, 10);
      const satisAdet = parseInt(u.satilanAdet || 0, 10);
      const satisHiz = periodDays > 0 ? Number((satisAdet / periodDays).toFixed(2)) : 0;
      const stokGun = satisHiz > 0 ? Math.round(tstok / satisHiz) : 0;

      const toplamBeden = Math.max(parseInt(u.toplamBeden || 0, 10), 1);
      const aktifBeden = parseInt(u.aktifBeden || 0, 10);
      const bedenKiriklikOrani = Math.round((aktifBeden / toplamBeden) * 100);

      let oneri = '-';
      if (tstok === 0) {
        oneri = 'Sıfır Stok';
        sifirStokSayisi++;
      } else if (satisAdet > 0 && stokGun > 0 && stokGun <= 30) {
        oneri = 'Stok Tedariği';
        kritikStokSayisi++;
      } else if (satisAdet === 0 || stokGun >= 90) {
        oneri = 'İndirim Uygula';
        stokFazlasiSayisi++;
      }

      if (bedenKiriklikOrani < 70) yuksekBedenKriklikSayisi++;

      return {
        ...u,
        toplamStok: tstok,
        satisHiz,
        stokGun,
        bedenKiriklikOrani,
        oneri,
        sonSatisTarihi: u.son_satis_tarihi
      };
    });

    return {
      periodDays,
      kpis: {
        sifirStokSayisi,
        kritikStokSayisi,
        stokFazlasiSayisi,
        yuksekBedenKriklikSayisi
      },
      urunler: list
    };
  });

  // GET /api/stok/:stokKodu/zaman-serisi
  fastify.get('/:stokKodu/zaman-serisi', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const rawStokKodu = request.params.stokKodu;
    let stokKodu = rawStokKodu;
    try {
      stokKodu = decodeURIComponent(rawStokKodu);
    } catch (e) {
      stokKodu = rawStokKodu;
    }

    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let baseValue = 100000;
    
    for (let y = 2025; y <= 2026; y++) {
      for (let m = 0; m < 12; m++) {
        // Stop going into too far future
        if (y === 2026 && m > 10) continue;

        const isForecast = (y === 2026 && m > 3); // Forecast from May 2026
        const isTransition = (y === 2026 && m === 3); // April 2026 is connect point
        const label = `${months[m]} ${y}`;
        
        baseValue = baseValue + (Math.random() * 40000 - 20000);
        if (baseValue < 30000) baseValue = 30000 + Math.random() * 20000;
        
        const actual = Math.round(baseValue);
        
        if (isForecast) {
          data.push({
            name: label,
            actual: null,
            forecast: actual,
            range: [Math.round(actual * 0.7), Math.round(actual * 1.3)]
          });
        } else if (isTransition) {
          data.push({
            name: label,
            actual: actual,
            forecast: actual,
            range: [actual, actual]
          });
        } else {
          data.push({
            name: label,
            actual: actual,
            forecast: null
          });
        }
      }
    }
    
    return data;
  });
};
