'use strict';
const { FiyatGecmisi, KanalUrun, Urun, Kanal, Kullanici } = require('../models');

module.exports = async function fiyatGecmisiRoutes(fastify) {
  // GET /api/fiyat-gecmisi?kanal_urun_id=
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { kanal_urun_id, page = 1, limit = 30 } = request.query;
    const where = {};
    if (kanal_urun_id) where.kanal_urun_id = kanal_urun_id;

    const { count, rows } = await FiyatGecmisi.findAndCountAll({
      where,
      include: [
        {
          model: KanalUrun,
          include: [
            { model: Urun,  attributes: ['urun_adi'] },
            { model: Kanal, attributes: ['kanal_adi'] },
          ],
        },
        { model: Kullanici, as: 'DegistirenKullanici', attributes: ['ad_soyad'], required: false },
      ],
      order:  [['degisim_tarihi', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return { toplam: count, gecmis: rows };
  });
};
