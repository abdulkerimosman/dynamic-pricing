'use strict';
const { Kanal, KanalUrun, Urun } = require('../models');

module.exports = async function kanallarRoutes(fastify) {
  // GET /api/kanallar
  fastify.get('/', { preHandler: [fastify.authenticate] }, async () =>
    Kanal.findAll({ order: [['kanal_adi', 'ASC']] })
  );

  // GET /api/kanallar/:id
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const kanal = await Kanal.findByPk(request.params.id, {
      include: [{ model: KanalUrun, include: [{ model: Urun, attributes: ['urun_adi', 'maliyet'] }], limit: 50 }],
    });
    if (!kanal) return reply.code(404).send({ error: 'Kanal bulunamadı.' });
    return kanal;
  });

  // POST /api/kanallar
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const kanal = await Kanal.create(request.body);
    return reply.code(201).send(kanal);
  });
};
