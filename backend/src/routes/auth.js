'use strict';
const bcrypt = require('bcryptjs');
const { Kullanici, Rol, IslemLog } = require('../models');

module.exports = async function authRoutes(fastify) {
  // POST /api/auth/giris — Login
  fastify.post('/giris', {
    schema: {
      body: {
        type: 'object',
        required: ['eposta', 'sifre'],
        properties: {
          eposta: { type: 'string', format: 'email' },
          sifre:  { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { eposta, sifre } = request.body;

    const kullanici = await Kullanici.findOne({
      where: { eposta },
      include: [{ model: Rol }],
    });

    if (!kullanici) {
      return reply.code(401).send({ error: 'E-posta veya şifre hatalı.' });
    }

    const sifreDogrumu = await bcrypt.compare(sifre, kullanici.sifre_hash);
    if (!sifreDogrumu) {
      return reply.code(401).send({ error: 'E-posta veya şifre hatalı.' });
    }

    const roller = kullanici.Rols?.map((r) => r.rol_adi) ?? [];

    const token = fastify.jwt.sign({
      kullanici_id: kullanici.kullanici_id,
      eposta:       kullanici.eposta,
      ad_soyad:     kullanici.ad_soyad,
      roller,
    });

    // Audit log
    await IslemLog.create({
      kullanici_id: kullanici.kullanici_id,
      islem_tipi:   'LOGIN',
      aciklama:     `${kullanici.ad_soyad} giriş yaptı`,
      ip_adresi:    request.ip,
    }).catch(() => {});

    return reply.send({
      token,
      kullanici: {
        kullanici_id: kullanici.kullanici_id,
        ad_soyad:     kullanici.ad_soyad,
        eposta:       kullanici.eposta,
        roller,
      },
    });
  });

  // GET /api/auth/ben — Current user info
  fastify.get('/ben', { preHandler: [fastify.authenticate] }, async (request) => {
    const { kullanici_id } = request.user;
    const kullanici = await Kullanici.findByPk(kullanici_id, {
      attributes: { exclude: ['sifre_hash'] },
      include: [{ model: Rol }],
    });
    return kullanici;
  });
};
