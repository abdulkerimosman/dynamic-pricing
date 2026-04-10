'use strict';
const bcrypt = require('bcryptjs');
const { Kullanici, Rol, KullaniciRol } = require('../models');

module.exports = async function kullanicilarRoutes(fastify) {
  // GET /api/kullanicilar — Admin only
  fastify.get('/', { preHandler: [fastify.authenticate] }, async () => {
    return Kullanici.findAll({
      attributes: { exclude: ['sifre_hash'] },
      include: [{ model: Rol }],
      order: [['ad_soyad', 'ASC']],
    });
  });

  // POST /api/kullanicilar — Create user
  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { ad_soyad, eposta, sifre, rol_id } = request.body;
    const sifre_hash = await bcrypt.hash(sifre, 10);
    const kullanici = await Kullanici.create({ ad_soyad, eposta, sifre_hash });
    if (rol_id) await KullaniciRol.create({ kullanici_id: kullanici.kullanici_id, rol_id });
    const { sifre_hash: _, ...data } = kullanici.toJSON();
    return reply.code(201).send(data);
  });

  // PUT /api/kullanicilar/:id — Update user
  fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { ad_soyad, eposta, sifre } = request.body;
    const updates = { ad_soyad, eposta };
    if (sifre) updates.sifre_hash = await bcrypt.hash(sifre, 10);
    const [updated] = await Kullanici.update(updates, { where: { kullanici_id: request.params.id } });
    if (!updated) return reply.code(404).send({ error: 'Kullanıcı bulunamadı.' });
    return Kullanici.findByPk(request.params.id, { attributes: { exclude: ['sifre_hash'] } });
  });

  // DELETE /api/kullanicilar/:id
  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const deleted = await Kullanici.destroy({ where: { kullanici_id: request.params.id } });
    if (!deleted) return reply.code(404).send({ error: 'Kullanıcı bulunamadı.' });
    return { mesaj: 'Kullanıcı silindi.' };
  });

  // GET /api/kullanicilar/roller
  fastify.get('/roller', { preHandler: [fastify.authenticate] }, async () => Rol.findAll());
};
