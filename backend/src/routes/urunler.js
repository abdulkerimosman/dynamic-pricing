'use strict';
const { Op } = require('sequelize');
const { Urun, Kategori, Marka, KanalUrun, Kanal, Stok, Beden, RakipFiyat } = require('../models');

module.exports = async function urunlerRoutes(fastify) {
  // GET /api/urunler — List all products with optional filters
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { kategori_id, marka_id, search, page = 1, limit = 20 } = request.query;
    const where = {};
    if (kategori_id) where.kategori_id = kategori_id;
    if (marka_id)    where.marka_id    = marka_id;
    if (search)      where.urun_adi    = { [Op.like]: `%${search}%` };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Urun.findAndCountAll({
      where,
      include: [
        { model: Kategori, attributes: ['kategori_id', 'kategori_adi', 'kar_beklentisi'] },
        { model: Marka,    attributes: ['marka_id', 'marka_adi'] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['urun_adi', 'ASC']],
    });

    return { toplam: count, sayfa: parseInt(page), limit: parseInt(limit), urunler: rows };
  });

  // GET /api/urunler/:id — Single product with full pricing detail
  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const urun = await Urun.findByPk(request.params.id, {
      include: [
        { model: Kategori },
        { model: Marka },
        {
          model: KanalUrun,
          include: [{ model: Kanal, attributes: ['kanal_id', 'kanal_adi', 'kanal_sahibi'] }],
        },
        {
          model: Stok,
          include: [{ model: Beden }],
        },
      ],
    });
    if (!urun) return reply.code(404).send({ error: 'Ürün bulunamadı.' });
    return urun;
  });

  // POST /api/urunler — Create product
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const urun = await Urun.create(request.body);
    return reply.code(201).send(urun);
  });

  // PUT /api/urunler/:id — Update product
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const [updated] = await Urun.update(request.body, { where: { urun_id: request.params.id } });
    if (!updated) return reply.code(404).send({ error: 'Ürün bulunamadı.' });
    return Urun.findByPk(request.params.id);
  });

  // DELETE /api/urunler/:id — Delete product
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const deleted = await Urun.destroy({ where: { urun_id: request.params.id } });
    if (!deleted) return reply.code(404).send({ error: 'Ürün bulunamadı.' });
    return { mesaj: 'Ürün silindi.' };
  });
};
