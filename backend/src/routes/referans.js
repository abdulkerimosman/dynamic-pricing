'use strict';

const XLSX = require('xlsx');

const {
  Marka,
  Kategori,
  Sezon,
  Beden,
  Cinsiyet,
  Urun,
  UrunCinsiyet,
  Kanal,
  KanalUrun,
  Rakip,
  KategoriSezon,
  FiyatlandirmaKurali,
} = require('../models');

const TABLES = {
  marka: {
    model: Marka,
    pk: 'marka_id',
    fields: ['marka_adi'],
    required: ['marka_adi'],
    order: [['marka_adi', 'ASC']],
  },
  kategoriler: {
    model: Kategori,
    pk: 'kategori_id',
    fields: ['kategori_adi', 'kar_beklentisi'],
    required: ['kategori_adi', 'kar_beklentisi'],
    order: [['kategori_adi', 'ASC']],
    numericFields: ['kar_beklentisi'],
  },
  sezonlar: {
    model: Sezon,
    pk: 'sezon_id',
    fields: ['sezon_adi', 'baslangic_tarihi', 'bitis_tarihi'],
    required: ['sezon_adi', 'baslangic_tarihi', 'bitis_tarihi'],
    order: [['sezon_adi', 'ASC']],
  },
  beden: {
    model: Beden,
    pk: 'beden_id',
    fields: ['beden_adi'],
    required: ['beden_adi'],
    order: [['beden_adi', 'ASC']],
  },
  cinsiyetler: {
    model: Cinsiyet,
    pk: 'cinsiyet_id',
    fields: ['cinsiyet_adi'],
    required: ['cinsiyet_adi'],
    order: [['cinsiyet_adi', 'ASC']],
  },
  urunler: {
    model: Urun,
    pk: 'urun_id',
    fields: ['barkod', 'stok_kodu', 'urun_adi', 'kategori_id', 'marka_id', 'maliyet', 'resim_url'],
    required: ['stok_kodu', 'urun_adi', 'kategori_id', 'marka_id', 'maliyet'],
    order: [['stok_kodu', 'ASC']],
    numericFields: ['kategori_id', 'marka_id', 'maliyet'],
  },
  urun_cinsiyet: {
    model: UrunCinsiyet,
    pk: 'urun_cinsiyet_id',
    fields: ['urun_id', 'cinsiyet_id'],
    required: ['urun_id', 'cinsiyet_id'],
    order: [['urun_id', 'ASC'], ['cinsiyet_id', 'ASC']],
    numericFields: ['urun_id', 'cinsiyet_id'],
  },
  kanallar: {
    model: Kanal,
    pk: 'kanal_id',
    fields: ['kanal_adi', 'kanal_url', 'kanal_aciklamasi', 'kanal_sahibi'],
    required: ['kanal_adi'],
    order: [['kanal_adi', 'ASC']],
    booleanFields: ['kanal_sahibi'],
  },
  kanal_urun: {
    model: KanalUrun,
    pk: 'kanal_urun_id',
    fields: [
      'kanal_id',
      'urun_id',
      'web_liste_fiyati',
      'web_indirim_fiyati',
      'pazaryeri_liste_fiyat',
      'pazaryeri_indirim_fiyat',
    ],
    required: ['kanal_id', 'urun_id'],
    order: [['kanal_id', 'ASC'], ['urun_id', 'ASC']],
    numericFields: [
      'kanal_id',
      'urun_id',
      'web_liste_fiyati',
      'web_indirim_fiyati',
      'pazaryeri_liste_fiyat',
      'pazaryeri_indirim_fiyat',
    ],
  },
  rakipler: {
    model: Rakip,
    pk: 'rakip_id',
    fields: ['rakip_adi', 'rakip_url'],
    required: ['rakip_adi'],
    order: [['rakip_adi', 'ASC']],
  },
  kategori_sezon: {
    model: KategoriSezon,
    pk: 'kategori_sezon_id',
    fields: ['kategori_id', 'sezon_id'],
    required: ['kategori_id', 'sezon_id'],
    order: [['kategori_id', 'ASC'], ['sezon_id', 'ASC']],
    numericFields: ['kategori_id', 'sezon_id'],
  },
  fiyatlandirma_kurallari: {
    model: FiyatlandirmaKurali,
    pk: 'kural_id',
    fields: [
      'kanal_id',
      'kategori_id',
      'max_indirim',
      'min_kar',
      'rekabet_katsayisi',
      'geri_gelinebilecek_yuzde',
      'aylik_satis_hedefi',
      'haftalik_satis_hedefi',
      'aktiflik_durumu',
      'gecerlilik_baslangic',
      'gecerlilik_bitis',
    ],
    required: ['kanal_id', 'kategori_id', 'max_indirim', 'min_kar'],
    order: [['kural_id', 'DESC']],
    numericFields: [
      'kanal_id',
      'kategori_id',
      'max_indirim',
      'min_kar',
      'rekabet_katsayisi',
      'geri_gelinebilecek_yuzde',
      'aylik_satis_hedefi',
      'haftalik_satis_hedefi',
    ],
    booleanFields: ['aktiflik_durumu'],
  },
};

function getTableConfig(type) {
  return TABLES[type] || null;
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function parseBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const v = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'evet', 'on'].includes(v);
}

function parseRowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  });

  return rawRows.map((row) => {
    const mapped = {};
    Object.keys(row).forEach((key) => {
      mapped[normalizeHeader(key)] = row[key];
    });
    return mapped;
  });
}

function sanitizePayload(config, body, isUpdate = false) {
  const out = {};

  for (const field of config.fields) {
    if (!(field in body)) continue;

    let value = body[field];
    if (typeof value === 'string') value = value.trim();

    if (value === '') value = null;

    if (config.numericFields?.includes(field) && value !== null && value !== undefined) {
      const n = Number(String(value).replace(',', '.'));
      if (!Number.isFinite(n)) {
        throw new Error(`${field} sayisal bir deger olmali`);
      }
      out[field] = n;
      continue;
    }

    if (config.booleanFields?.includes(field) && value !== null && value !== undefined) {
      if (typeof value === 'boolean') {
        out[field] = value;
        continue;
      }
      const key = String(value).toLowerCase();
      out[field] = ['1', 'true', 'evet', 'yes', 'on'].includes(key);
      continue;
    }

    out[field] = value;
  }

  if (!isUpdate) {
    for (const requiredField of config.required || []) {
      if (out[requiredField] === null || out[requiredField] === undefined || out[requiredField] === '') {
        throw new Error(`${requiredField} zorunlu`);
      }
    }
  }

  if (isUpdate && Object.keys(out).length === 0) {
    throw new Error('Guncellenecek alan bulunamadi');
  }

  return out;
}

module.exports = async function referansRoutes(fastify) {
  fastify.get('/meta', { preHandler: [fastify.authenticate] }, async () => {
    const [kategoriler, kanallar, sezonlar, markalar, cinsiyetler, urunler] = await Promise.all([
      Kategori.findAll({ attributes: ['kategori_id', 'kategori_adi'], order: [['kategori_adi', 'ASC']], raw: true }),
      Kanal.findAll({ attributes: ['kanal_id', 'kanal_adi'], order: [['kanal_adi', 'ASC']], raw: true }),
      Sezon.findAll({ attributes: ['sezon_id', 'sezon_adi'], order: [['sezon_adi', 'ASC']], raw: true }),
      Marka.findAll({ attributes: ['marka_id', 'marka_adi'], order: [['marka_adi', 'ASC']], raw: true }),
      Cinsiyet.findAll({ attributes: ['cinsiyet_id', 'cinsiyet_adi'], order: [['cinsiyet_adi', 'ASC']], raw: true }),
      Urun.findAll({ attributes: ['urun_id', 'stok_kodu', 'urun_adi'], order: [['stok_kodu', 'ASC']], raw: true }),
    ]);

    return {
      kategoriler,
      kanallar,
      sezonlar,
      markalar,
      cinsiyetler,
      urunler: urunler.map((u) => ({
        ...u,
        urun_label: `${u.stok_kodu} - ${u.urun_adi}`,
      })),
    };
  });

  fastify.get('/:type', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    const rows = await config.model.findAll({ order: config.order });
    return {
      type: request.params.type,
      total: rows.length,
      rows,
    };
  });

  fastify.get('/template/:type', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    const workbook = XLSX.utils.book_new();
    const headers = [config.pk, ...config.fields];
    const sheetName = String(request.params.type).slice(0, 31) || 'referans';
    const sampleRow = headers.reduce((acc, h) => {
      acc[h] = '';
      return acc;
    }, {});

    const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${request.params.type}_import_template.xlsx"`)
      .send(buffer);
  });

  fastify.post('/:type/import', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer);
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const errors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      try {
        const payload = sanitizePayload(config, row, false);
        const pkRaw = row[config.pk];
        const pkValue = pkRaw === '' || pkRaw === null || pkRaw === undefined ? null : Number(pkRaw);

        if (pkValue !== null && !Number.isFinite(pkValue)) {
          throw new Error(`${config.pk} sayisal bir deger olmali`);
        }

        normalizedRows.push({
          row: rowNumber,
          pkValue,
          payload,
        });
      } catch (error) {
        errors.push({ row: rowNumber, errors: [error.message] });
      }
    });

    if (errors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: errors.length,
        errors,
      });
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: 'Dry run basarili. Commit icin dryRun=false gonderin.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: 0,
        preview: normalizedRows.slice(0, 10).map((r) => ({
          row: r.row,
          [config.pk]: r.pkValue,
          ...r.payload,
        })),
      };
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of normalizedRows) {
      if (item.pkValue !== null) {
        const existing = await config.model.findByPk(item.pkValue);
        if (existing) {
          await existing.update(item.payload);
          updatedCount += 1;
          continue;
        }
      }

      await config.model.create(item.payload);
      createdCount += 1;
    }

    return {
      success: true,
      dryRun: false,
      totalRows: rows.length,
      createdCount,
      updatedCount,
    };
  });

  fastify.post('/:type', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    try {
      const payload = sanitizePayload(config, request.body || {}, false);
      const created = await config.model.create(payload);
      return reply.code(201).send(created);
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  fastify.put('/:type/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    const row = await config.model.findByPk(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Kayit bulunamadi' });

    try {
      const payload = sanitizePayload(config, request.body || {}, true);
      await row.update(payload);
      return row;
    } catch (error) {
      return reply.code(400).send({ error: error.message });
    }
  });

  fastify.delete('/:type/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const config = getTableConfig(request.params.type);
    if (!config) return reply.code(404).send({ error: 'Referans tablo tipi bulunamadi' });

    const row = await config.model.findByPk(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Kayit bulunamadi' });

    try {
      await row.destroy();
      return { success: true, message: 'Kayit silindi' };
    } catch (error) {
      const isForeignKeyError =
        error?.name === 'SequelizeForeignKeyConstraintError' ||
        error?.original?.code === 'ER_ROW_IS_REFERENCED_2' ||
        error?.original?.errno === 1451;

      if (isForeignKeyError) {
        return reply.code(400).send({
          success: false,
          error: 'Bu kayit baska tablolarda kullanildigi icin silinemez. Once bagli kayitlari temizleyin.',
          code: 'FK_CONSTRAINT',
          table: request.params.type,
          id: request.params.id,
        });
      }

      return reply.code(400).send({
        success: false,
        error: error.message || 'Kayit silinemedi',
      });
    }
  });
};
