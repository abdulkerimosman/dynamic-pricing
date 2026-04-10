'use strict';
const { KampanyaPlan, Kanal, Sezon } = require('../models');

module.exports = async function kampanyalarRoutes(fastify) {
  // GET /api/kampanyalar
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { kanal_id } = request.query;
    const where = {};
    if (kanal_id) where.kanal_id = kanal_id;

    return KampanyaPlan.findAll({
      where,
      include: [
        { model: Kanal, attributes: ['kanal_adi'] },
        { model: Sezon, attributes: ['sezon_adi', 'baslangic_tarihi', 'bitis_tarihi'], required: false },
      ],
      order: [['baslangic_tarihi', 'DESC']],
    });
  });

  // GET /api/kampanyalar/:id
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const k = await KampanyaPlan.findByPk(request.params.id, {
      include: [{ model: Kanal }, { model: Sezon, required: false }],
    });
    if (!k) return reply.code(404).send({ error: 'Kampanya bulunamadı.' });
    return k;
  });

  // POST /api/kampanyalar
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const kampanya = await KampanyaPlan.create(request.body);
    return reply.code(201).send(kampanya);
  });

  // PUT /api/kampanyalar/:id
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [updated] = await KampanyaPlan.update(request.body, { where: { kampanya_id: request.params.id } });
    if (!updated) return reply.code(404).send({ error: 'Kampanya bulunamadı.' });
    return KampanyaPlan.findByPk(request.params.id);
  });

  // DELETE /api/kampanyalar/:id
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const deleted = await KampanyaPlan.destroy({ where: { kampanya_id: request.params.id } });
    if (!deleted) return reply.code(404).send({ error: 'Kampanya bulunamadı.' });
    return { mesaj: 'Kampanya silindi.' };
  });
};
