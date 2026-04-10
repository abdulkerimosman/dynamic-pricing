'use strict';
const { Op, fn, col, literal } = require('sequelize');
const { Satis, KanalUrun, Kanal, Urun } = require('../models');

module.exports = async function satislarRoutes(fastify) {
  // GET /api/satislar
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { kanal_id, from, to, page = 1, limit = 30 } = request.query;
    const where = {};
    if (from || to) {
      where.satis_tarihi = {};
      if (from) where.satis_tarihi[Op.gte] = new Date(from);
      if (to)   where.satis_tarihi[Op.lte] = new Date(to);
    }

    const kuWhere = {};
    if (kanal_id) kuWhere.kanal_id = kanal_id;

    const { count, rows } = await Satis.findAndCountAll({
      where,
      include: [{
        model: KanalUrun,
        where: kuWhere,
        include: [
          { model: Urun,  attributes: ['urun_adi'] },
          { model: Kanal, attributes: ['kanal_adi'] },
        ],
      }],
      order:  [['satis_tarihi', 'DESC']],
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return { toplam: count, satislar: rows };
  });

  // GET /api/satislar/ozet — Revenue summary grouped by day (for charts)
  fastify.get('/ozet', { preHandler: [fastify.authenticate] }, async (request) => {
    const { from, to, kanal_id } = request.query;
    const where = {};
    if (from) where.satis_tarihi = { [Op.gte]: new Date(from) };
    if (to)   where.satis_tarihi = { ...(where.satis_tarihi || {}), [Op.lte]: new Date(to) };

    return Satis.findAll({
      attributes: [
        [fn('DATE', col('satis_tarihi')), 'tarih'],
        [fn('SUM', literal('satis_miktari * birim_fiyat')), 'ciro'],
        [fn('SUM', literal('satis_miktari * maliyet_snapshot')), 'maliyet'],
        [fn('SUM', col('satis_miktari')), 'adet'],
      ],
      where,
      group: [fn('DATE', col('satis_tarihi'))],
      order: [[fn('DATE', col('satis_tarihi')), 'ASC']],
      raw: true,
    });
  });
};
