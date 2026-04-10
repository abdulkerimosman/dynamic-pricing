'use strict';
const { Rakip, RakipFiyat, Urun, Kanal, Beden } = require('../models');

module.exports = async function rakiplerRoutes(fastify) {
  // GET /api/rakipler
  fastify.get('/', { preHandler: [fastify.authenticate] }, async () => Rakip.findAll({ order: [['rakip_adi', 'ASC']] }));

  // POST /api/rakipler
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const rakip = await Rakip.create(request.body);
    return reply.code(201).send(rakip);
  });

  // GET /api/rakipler/fiyatlar — All competitor prices with optional filters
  fastify.get('/fiyatlar', { preHandler: [fastify.authenticate] }, async (request) => {
    const { urun_id, kanal_id, page = 1, limit = 30 } = request.query;
    const where = {};
    if (urun_id)  where.urun_id  = urun_id;
    if (kanal_id) where.kanal_id = kanal_id;

    const { count, rows } = await RakipFiyat.findAndCountAll({
      where,
      include: [
        { model: Urun,  attributes: ['urun_adi'] },
        { model: Rakip, attributes: ['rakip_adi', 'rakip_url'] },
        { model: Kanal, attributes: ['kanal_adi'] },
        { model: Beden, attributes: ['beden_adi'], required: false },
      ],
      order: [['veri_kazima_zamani', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return { toplam: count, fiyatlar: rows };
  });

  // POST /api/rakipler/fiyat-gir — Record a competitor price
  fastify.post('/fiyat-gir', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const fiyat = await RakipFiyat.create(request.body);
    return reply.code(201).send(fiyat);
  });
};
