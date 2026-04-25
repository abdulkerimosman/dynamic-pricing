'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Fastify = require('fastify');
const db      = require('./models');

async function buildApp() {
  const app = Fastify({ logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' } });

  // ── Plugins ──────────────────────────────────────────────────────────────
  await app.register(require('@fastify/cors'), {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  await app.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });

  await app.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MIN_32_CHARS!!',
    sign: { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  });

  await app.register(require('@fastify/swagger'), {
    openapi: {
      info: { title: 'Sporthink API', description: 'Dinamik Fiyatlama Sistemi', version: '1.0.0' },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  });

  await app.register(require('@fastify/swagger-ui'), { routePrefix: '/api-docs' });

  // ── Auth decorator (used as preHandler on protected routes) ──────────────
  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
    }
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  app.register(require('./routes/auth'),            { prefix: '/api/auth' });
  app.register(require('./routes/dashboard'),       { prefix: '/api/dashboard' });
  app.register(require('./routes/urunler'),         { prefix: '/api/urunler' });
  app.register(require('./routes/kanallar'),        { prefix: '/api/kanallar' });
  app.register(require('./routes/fiyatOnerileri'),  { prefix: '/api/fiyat-onerileri' });
  app.register(require('./routes/fiyatGecmisi'),    { prefix: '/api/fiyat-gecmisi' });
  app.register(require('./routes/rakipler'),        { prefix: '/api/rakipler' });
  app.register(require('./routes/stok'),            { prefix: '/api/stok' });
  app.register(require('./routes/alertler'),        { prefix: '/api/alertler' });
  app.register(require('./routes/kampanya'),        { prefix: '/api/kampanya' });
  app.register(require('./routes/kampanyalar'),     { prefix: '/api/kampanyalar' });
  app.register(require('./routes/satislar'),        { prefix: '/api/satislar' });
  app.register(require('./routes/kullanicilar'),    { prefix: '/api/kullanicilar' });
  app.register(require('./routes/referans'),        { prefix: '/api/referans' });
  app.register(require('./routes/urunAnalizi'),     { prefix: '/api/urun-analizi' });
  app.register(require('./routes/import'),          { prefix: '/api/import' });

  // ── Health check ─────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler(async (error, request, reply) => {
    const { HataLog } = db;
    await HataLog.create({
      hata_tipi: error.name || 'UnknownError',
      hata_mesaji: error.message,
      yigin_izi: error.stack,
      endpoint: request.url,
    }).catch(() => {}); // never crash on log failure
    reply.code(error.statusCode || 500).send({ error: error.message });
  });

  return app;
}

async function start() {
  const app = await buildApp();
  try {
    await db.sequelize.authenticate();
    app.log.info('✅ MySQL bağlantısı başarılı — veritabanı: sporthink');
    await app.listen({ port: parseInt(process.env.PORT || '3001'), host: '0.0.0.0' });
    app.log.info(`📖 Swagger UI: http://localhost:${process.env.PORT || 3001}/api-docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
module.exports = { buildApp };
