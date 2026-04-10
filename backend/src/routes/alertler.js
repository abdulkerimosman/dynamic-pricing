'use strict';
const { Alert, KanalUrun, Urun, Kanal } = require('../models');

module.exports = async function alertlerRoutes(fastify) {
  // GET /api/alertler
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request) => {
    const { durum, page = 1, limit = 20 } = request.query;
    const where = {};
    if (durum) where.durum = durum;

    const { count, rows } = await Alert.findAndCountAll({
      where,
      include: [{
        model: KanalUrun,
        include: [
          { model: Urun,  attributes: ['urun_adi', 'resim_url'] },
          { model: Kanal, attributes: ['kanal_adi'] },
        ],
      }],
      order: [['olusturma_tarihi', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    return { toplam: count, alertler: rows };
  });

  // PATCH /api/alertler/:id/coz — Resolve alert
  fastify.patch('/:id/coz', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const alert = await Alert.findByPk(request.params.id);
    if (!alert) return reply.code(404).send({ error: 'Alert bulunamadı.' });
    await alert.update({
      durum:              'cozuldu',
      cozulme_tarihi:     new Date(),
      cozen_kullanici_id: request.user.kullanici_id,
    });
    return { mesaj: 'Alert çözüldü olarak işaretlendi.', alert };
  });
};
