'use strict';
const { FiyatOnerisi, KanalUrun, Urun, Kanal, Kullanici, FiyatGecmisi, Alert, IslemLog } = require('../models');
const pricingEngine = require('../services/pricingEngine');
const { Op } = require('sequelize');

const INCLUDE_FULL = [
  {
    model: KanalUrun,
    include: [
      { model: Urun,  attributes: ['urun_id', 'urun_adi', 'maliyet', 'resim_url'] },
      { model: Kanal, attributes: ['kanal_id', 'kanal_adi'] },
    ],
  },
  { model: Kullanici, as: 'OnaylayanKullanici', attributes: ['kullanici_id', 'ad_soyad'], required: false },
];

module.exports = async function fiyatOnerisiRoutes(fastify) {
  // GET /api/fiyat-onerileri — List suggestions with filters
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { durum, kanal_id, page = 1, limit = 20 } = request.query;
    const where = {};
    if (durum) where.durum = durum;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await FiyatOnerisi.findAndCountAll({
      where,
      include: INCLUDE_FULL,
      order: [['olusturma_tarihi', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { toplam: count, sayfa: parseInt(page), oneriler: rows };
  });

  // GET /api/fiyat-onerileri/:id
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const oneri = await FiyatOnerisi.findByPk(request.params.id, { include: INCLUDE_FULL });
    if (!oneri) return reply.code(404).send({ error: 'Öneri bulunamadı.' });
    return oneri;
  });

  // PATCH /api/fiyat-onerileri/:id/onayla — Approve suggestion
  fastify.patch('/:id/onayla', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const oneri = await FiyatOnerisi.findByPk(request.params.id, { include: [{ model: KanalUrun }] });
    if (!oneri) return reply.code(404).send({ error: 'Öneri bulunamadı.' });
    if (oneri.durum !== 'beklemede') return reply.code(400).send({ error: 'Bu öneri zaten işleme alınmış.' });

    const kanalUrun = oneri.KanalUrun;

    // Determine which price field to use based on associated channel type
    const kanalDetay = await Kanal.findByPk(kanalUrun.kanal_id);
    const isOwnWebsite = kanalDetay?.kanal_sahibi === 1;
    const eskiFiyat = isOwnWebsite
      ? (parseFloat(kanalUrun.web_indirim_fiyati) || parseFloat(kanalUrun.web_liste_fiyati) || 0)
      : (parseFloat(kanalUrun.pazaryeri_indirim_fiyat) || parseFloat(kanalUrun.pazaryeri_liste_fiyat) || 0);

    // 1. Save price history before update
    await FiyatGecmisi.create({
      kanal_urun_id:           kanalUrun.kanal_urun_id,
      eski_fiyat:              eskiFiyat,
      yeni_fiyat:              oneri.onerilen_fiyat,
      degistiren_kullanici_id: request.user.kullanici_id,
      degisim_nedeni:          `Onaylanan öneri #${oneri.oneri_id}: ${oneri.neden}`,
    });

    // 2. Actually update the live price in kanal_urun
    if (isOwnWebsite) {
      await kanalUrun.update({ web_indirim_fiyati: oneri.onerilen_fiyat });
    } else {
      await kanalUrun.update({ pazaryeri_indirim_fiyat: oneri.onerilen_fiyat });
    }

    // 3. Mark suggestion as approved
    await oneri.update({
      durum:                  'onaylandi',
      onaylayan_kullanici_id: request.user.kullanici_id,
      onay_tarihi:            new Date(),
    });

    // 4. Write to audit log
    await IslemLog.create({
      kullanici_id: request.user.kullanici_id,
      islem_tipi:   'PRICE_APPROVED',
      tablo_adi:    'kanal_urun',
      kayit_id:     String(kanalUrun.kanal_urun_id),
      aciklama:     `Öneri #${oneri.oneri_id}: ${eskiFiyat} → ${oneri.onerilen_fiyat} TL. Sebep: ${oneri.neden}`,
      ip_adresi:    request.ip,
    }).catch(() => {});

    return { mesaj: 'Fiyat önerisi onaylandı ve fiyat güncellendi.', oneri };
  });

  // PATCH /api/fiyat-onerileri/:id/reddet — Reject suggestion
  fastify.patch('/:id/reddet', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const oneri = await FiyatOnerisi.findByPk(request.params.id);
    if (!oneri) return reply.code(404).send({ error: 'Öneri bulunamadı.' });
    if (oneri.durum !== 'beklemede') return reply.code(400).send({ error: 'Bu öneri zaten işleme alınmış.' });

    await oneri.update({
      durum:                  'reddedildi',
      onaylayan_kullanici_id: request.user.kullanici_id,
      onay_tarihi:            new Date(),
    });

    return { mesaj: 'Fiyat önerisi reddedildi.', oneri };
  });

  // POST /api/fiyat-onerileri/uret — Generate suggestion for a kanal_urun
  fastify.post('/uret', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { kanal_urun_id } = request.body;
    const { KanalUrun: KanalUrunModel, Urun: UrunModel, Stok, RakipFiyat, FiyatlandirmaKurali, Kategori } = require('../models');

    const kanalUrun = await KanalUrunModel.findByPk(kanal_urun_id, {
      include: [{ model: UrunModel, include: [{ model: Kategori }] }],
    });
    if (!kanalUrun) return reply.code(404).send({ error: 'Kanal ürün bulunamadı.' });

    const [stoklar, rakipFiyatlar, kurals] = await Promise.all([
      Stok.findAll({ where: { urun_id: kanalUrun.urun_id } }),
      RakipFiyat.findAll({ where: { urun_id: kanalUrun.urun_id, kanal_id: kanalUrun.kanal_id }, order: [['veri_kazima_zamani', 'DESC']], limit: 10 }),
      FiyatlandirmaKurali.findAll({ where: { kanal_id: kanalUrun.kanal_id, kategori_id: kanalUrun.Urun.kategori_id, aktiflik_durumu: true } }),
    ]);

    if (!kurals.length) return reply.code(400).send({ error: 'Bu kanal ve kategori için aktif fiyatlandırma kuralı bulunamadı.' });

    const kural     = kurals[0];
    const sonuc     = pricingEngine.compute({ urun: kanalUrun.Urun, kanalUrun, kural, rakipFiyatlar, stoklar });
    const mevcutFiyat = parseFloat(kanalUrun.pazaryeri_indirim_fiyat || kanalUrun.web_indirim_fiyati || 0);

    const oneri = await FiyatOnerisi.create({
      kanal_urun_id,
      mevcut_fiyat:   mevcutFiyat,
      onerilen_fiyat: sonuc.onerilenFiyat,
      neden:          sonuc.neden,
      durum:          'beklemede',
    });

    // Auto-create alerts for high-risk suggestions
    if (sonuc.uyarilar.length > 0) {
      await Alert.create({
        kanal_urun_id,
        alert_tipi: sonuc.uyarilar[0],
        mesaj:      sonuc.neden,
        durum:      'acik',
      });
    }

    return { oneri, sonuc };
  });
};
