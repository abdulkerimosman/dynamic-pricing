'use strict';

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  sequelize,
  Urun,
  Marka,
  Kategori,
  Cinsiyet,
  UrunCinsiyet,
  Kanal,
  KanalUrun,
  Stok,
  Beden,
  Rakip,
  RakipFiyat,
  FiyatlandirmaKurali,
  FiyatOnerisi,
  Alert,
  IslemLog,
  Satis,
  KampanyaPlan,
  Sezon,
} = require('../models');
const pricingEngine = require('../services/pricingEngine');
const {
  validateStokDependencies,
  validateRakipFiyatlarDependencies,
  validateSatislarDependencies,
} = require('../services/importValidator');

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

function normalizeGenderName(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  if (!key) return 'Unisex';
  if (['kadin', 'kadın', 'bayan', 'women', 'woman'].includes(key)) return 'Kadın';
  if (['erkek', 'bay', 'men', 'man'].includes(key)) return 'Erkek';
  if (['cocuk', 'çocuk', 'kids', 'kid', 'bebek'].includes(key)) return 'Çocuk';
  if (['unisex', 'uni'].includes(key)) return 'Unisex';
  return null;
}

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const v = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'evet', 'on'].includes(v);
}

function parseNum(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

  // ========== DIAGNOSTIC ENDPOINT ==========
  /**
   * GET /check-dependencies
   * Helps users see what reference data exists before attempting Tier 2 imports
   */
  fastify.get('/check-dependencies', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const [
        urunCount, bedenCount, rakipCount, kanalCount,
        urunlerList, bedenlerList, rakiplerList, kanallarList
      ] = await Promise.all([
        Urun.count(),
        Beden.count(),
        Rakip.count(),
        Kanal.count(),
        Urun.findAll({ attributes: ['urun_id', 'stok_kodu', 'urun_adi'], limit: 50, order: [['stok_kodu', 'ASC']] }),
        Beden.findAll({ attributes: ['beden_id', 'beden_adi'], limit: 50, order: [['beden_adi', 'ASC']] }),
        Rakip.findAll({ attributes: ['rakip_id', 'rakip_adi'], limit: 50, order: [['rakip_adi', 'ASC']] }),
        Kanal.findAll({ attributes: ['kanal_id', 'kanal_adi', 'kanal_sahibi'], limit: 50, order: [['kanal_adi', 'ASC']] }),
      ]);

      return {
        status: 'success',
        summary: {
          urunlerToplam: urunCount,
          bedenlerToplam: bedenCount,
          rakiplerToplam: rakipCount,
          kanallarToplam: kanalCount,
        },
        readyForStokImport: urunCount > 0 && bedenCount > 0,
        readyForRakipFiyatImport: urunCount > 0 && rakipCount > 0 && kanalCount > 0,
        readyForSatislarImport: urunCount > 0 && kanalCount > 0,
        samples: {
          urunler: urunlerList,
          bedenler: bedenlerList,
          rakipler: rakiplerList,
          kanallar: kanallarList,
        },
        nextSteps: {
          stokNotReady: urunCount === 0 || bedenCount === 0
            ? 'Urunler ve Bedenler seed edilmeli'
            : 'Hazir',
          rakipFiyatNotReady: urunCount === 0 || rakipCount === 0 || kanalCount === 0
            ? 'Urunler, Rakipler ve Kanallar seed edilmeli'
            : 'Hazir',
          satislarNotReady: urunCount === 0 || kanalCount === 0
            ? 'Urunler ve Kanallar seed edilmeli'
            : 'Hazir',
        },
      };
    } catch (error) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  });
function parseRowsFromWorkbook(buffer, preferredSheetKey) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const preferredSheet = workbook.SheetNames.find((name) => normalizeHeader(name) === preferredSheetKey);
  const sheetName = preferredSheet || workbook.SheetNames[0];
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

async function triggerPricingForKanalUrunIds(kanalUrunIds) {
  const uniqueIds = [...new Set((kanalUrunIds || []).filter(Boolean))];
  let generated = 0;
  let skipped = 0;

  for (const kanalUrunId of uniqueIds) {
    const kanalUrun = await KanalUrun.findByPk(kanalUrunId, {
      include: [{ model: Urun, include: [{ model: Kategori }] }, { model: Kanal }],
    });

    if (!kanalUrun || !kanalUrun.Urun) {
      skipped += 1;
      continue;
    }

    const [stoklar, rakipFiyatlar, kurals] = await Promise.all([
      Stok.findAll({ where: { urun_id: kanalUrun.urun_id } }),
      RakipFiyat.findAll({
        where: { urun_id: kanalUrun.urun_id, kanal_id: kanalUrun.kanal_id },
        order: [['veri_kazima_zamani', 'DESC']],
        limit: 10,
      }),
      FiyatlandirmaKurali.findAll({
        where: {
          kanal_id: kanalUrun.kanal_id,
          kategori_id: kanalUrun.Urun.kategori_id,
          aktiflik_durumu: true,
        },
        limit: 1,
      }),
    ]);

    if (!kurals.length) {
      skipped += 1;
      continue;
    }

    const sonuc = pricingEngine.compute({
      urun: kanalUrun.Urun,
      kanalUrun,
      kural: kurals[0],
      rakipFiyatlar,
      stoklar,
    });

    const mevcutFiyat = parseFloat(kanalUrun.pazaryeri_indirim_fiyat || kanalUrun.web_indirim_fiyati || 0);

    const existingPending = await FiyatOnerisi.findOne({
      where: { kanal_urun_id: kanalUrunId, durum: 'beklemede' },
      order: [['olusturma_tarihi', 'DESC']],
    });

    if (existingPending) {
      await existingPending.update({
        mevcut_fiyat: mevcutFiyat,
        onerilen_fiyat: sonuc.onerilenFiyat,
        neden: sonuc.neden,
      });
    } else {
      await FiyatOnerisi.create({
        kanal_urun_id: kanalUrunId,
        mevcut_fiyat: mevcutFiyat,
        onerilen_fiyat: sonuc.onerilenFiyat,
        neden: sonuc.neden,
        durum: 'beklemede',
      });
    }

    if (sonuc.uyarilar.length > 0) {
      await Alert.create({
        kanal_urun_id: kanalUrunId,
        alert_tipi: sonuc.uyarilar[0],
        mesaj: sonuc.neden,
        durum: 'acik',
      }).catch(() => {});
    }

    generated += 1;
  }

  return { generated, skipped };
}

function validateDuplicate(rows, keyFn, label) {
  const seen = new Set();
  const duplicates = [];

  rows.forEach((row) => {
    const key = keyFn(row);
    if (!key) return;
    if (seen.has(key)) duplicates.push({ row: row.row, errors: [`Ayni dosyada tekrar eden ${label}: ${key}`] });
    seen.add(key);
  });

  return duplicates;
}

const TEMPLATE_DEFINITIONS = {
  'urun-master': {
    fileName: 'urun_master_ornek.xlsx',
    sheetName: 'urunler',
    headers: ['stok_kodu', 'barkod', 'urun_adi', 'marka_adi', 'kategori_adi', 'maliyet', 'resim_url', 'cinsiyetler'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        barkod: '868000000001',
        urun_adi: 'Ornek Tisort',
        marka_adi: 'Sporthink',
        kategori_adi: 'Tisort',
        maliyet: 149.9,
        resim_url: 'https://example.com/urunler/spt-1001.jpg',
        cinsiyetler: 'Unisex',
      },
    ],
  },
  stok: {
    fileName: 'stok_ornek.xlsx',
    sheetName: 'stok',
    headers: ['stok_kodu', 'beden_adi', 'stok_miktari', 'stok_katsayisi'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        beden_adi: 'M',
        stok_miktari: 24,
        stok_katsayisi: 1,
      },
    ],
  },
  'kanal-fiyat': {
    fileName: 'kanal_fiyat_ornek.xlsx',
    sheetName: 'kanal_fiyat',
    headers: ['kanal_adi', 'stok_kodu', 'web_liste_fiyati', 'web_indirim_fiyati', 'pazaryeri_liste_fiyat', 'pazaryeri_indirim_fiyat'],
    rows: [
      {
        kanal_adi: 'Sporthink Web',
        stok_kodu: 'SPT-1001',
        web_liste_fiyati: 249.9,
        web_indirim_fiyati: 219.9,
        pazaryeri_liste_fiyat: 279.9,
        pazaryeri_indirim_fiyati: 239.9,
      },
    ],
  },
  'rakip-fiyat': {
    fileName: 'rakip_fiyat_ornek.xlsx',
    sheetName: 'rakip_fiyat',
    headers: ['stok_kodu', 'rakip_adi', 'kanal_adi', 'beden_adi', 'fiyat'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        rakip_adi: 'Rakip Magaza A',
        kanal_adi: 'Trendyol',
        beden_adi: 'M',
        fiyat: 229.9,
      },
    ],
  },
  satislar: {
    fileName: 'satislar_ornek.xlsx',
    sheetName: 'satislar',
    headers: ['stok_kodu', 'kanal_adi', 'satis_miktari', 'birim_fiyat', 'maliyet_snapshot', 'satis_tarihi'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        kanal_adi: 'Sporthink Web',
        satis_miktari: 2,
        birim_fiyat: 219.9,
        maliyet_snapshot: 149.9,
        satis_tarihi: '2026-04-23',
      },
    ],
  },
  'fiyatlandirma-kurali': {
    fileName: 'fiyatlandirma_kurali_ornek.xlsx',
    sheetName: 'fiyatlandirma_kurallari',
    headers: ['kanal_adi', 'kategori_adi', 'max_indirim', 'min_kar', 'rekabet_katsayisi', 'geri_gelinebilecek_yuzde', 'aylik_satis_hedefi', 'haftalik_satis_hedefi', 'aktiflik_durumu', 'gecerlilik_baslangic', 'gecerlilik_bitis'],
    rows: [
      {
        kanal_adi: 'Sporthink Web',
        kategori_adi: 'Tisort',
        max_indirim: 0.25,
        min_kar: 0.3,
        rekabet_katsayisi: 1,
        geri_gelinebilecek_yuzde: 0.08,
        aylik_satis_hedefi: 50000,
        haftalik_satis_hedefi: 12000,
        aktiflik_durumu: true,
        gecerlilik_baslangic: '2026-04-01',
        gecerlilik_bitis: '2026-12-31',
      },
    ],
  },
  kampanya: {
    fileName: 'kampanya_ornek.xlsx',
    sheetName: 'kampanya',
    headers: ['kanal_adi', 'kampanya_adi', 'baslangic_tarihi', 'bitis_tarihi', 'hedef_indirim_orani', 'hedef_karlilik', 'sezon_adi'],
    rows: [
      {
        kanal_adi: 'Trendyol',
        kampanya_adi: 'Yaz Baslangic Kampanyasi',
        baslangic_tarihi: '2026-05-01',
        bitis_tarihi: '2026-05-31',
        hedef_indirim_orani: 0.15,
        hedef_karlilik: 0.28,
        sezon_adi: 'Yaz',
      },
    ],
  },
  'kullanici-fiyat': {
    fileName: 'kullanici_fiyat_ornek.xlsx',
    sheetName: 'user_prices',
    headers: ['stok_kodu', 'kullanici_onerilen_fiyat'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        kullanici_onerilen_fiyat: 214.9,
      },
    ],
  },
  'kampanya-planlama': {
    fileName: 'kampanya_planlama_ornek.xlsx',
    sheetName: 'kampanya_planlama',
    headers: ['stok_kodu', 'stok_adi', 'marka', 'kategori', 'maliyet', 'komisyon_orani', 'fiyat1', 'komisyon1', 'fiyat2', 'komisyon2', 'fiyat3', 'komisyon3', 'guncel_py_satis_fiyati'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        stok_adi: 'Ornek Tisort',
        marka: 'Sporthink',
        kategori: 'Tisort',
        maliyet: 149.9,
        komisyon_orani: 0.12,
        fiyat1: 219.9,
        komisyon1: 0.12,
        fiyat2: 229.9,
        komisyon2: 0.14,
        fiyat3: 239.9,
        komisyon3: 0.16,
        guncel_py_satis_fiyati: 224.9,
      },
    ],
  },
  'website-output': {
    fileName: 'website_fiyat_cikisi_ornek.xlsx',
    sheetName: 'website_fiyat_cikisi',
    headers: ['stok_kodu', 'urun_adi', 'mevcut_web_fiyati', 'onerilen_web_fiyati', 'beklenen_karlilik_yuzde', 'rakip_ortalama_fiyat', 'stok_durumu', 'not'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        urun_adi: 'Ornek Tisort',
        mevcut_web_fiyati: 229.9,
        onerilen_web_fiyati: 219.9,
        beklenen_karlilik_yuzde: 31.4,
        rakip_ortalama_fiyat: 234.9,
        stok_durumu: 'Normal',
        not: 'Web sitesi fiyat guncelleme cikisi',
      },
    ],
  },
  'marketplace-output': {
    fileName: 'marketplace_fiyat_cikisi_ornek.xlsx',
    sheetName: 'marketplace_fiyat_cikisi',
    headers: ['stok_kodu', 'urun_adi', 'kanal_adi', 'fiyat1', 'komisyon1', 'fiyat2', 'komisyon2', 'fiyat3', 'komisyon3', 'chosen_price', 'chosen_kar_orani', 'chosen_kar_tutari', 'chosen_source'],
    rows: [
      {
        stok_kodu: 'SPT-1001',
        urun_adi: 'Ornek Tisort',
        kanal_adi: 'Trendyol',
        fiyat1: 219.9,
        komisyon1: 0.12,
        fiyat2: 229.9,
        komisyon2: 0.14,
        fiyat3: 239.9,
        komisyon3: 0.16,
        chosen_price: 229.9,
        chosen_kar_orani: 0.31,
        chosen_kar_tutari: 72.1,
        chosen_source: 'tier_2',
      },
    ],
  },
};

function buildTemplateBuffer(template) {
  const worksheet = XLSX.utils.json_to_sheet(template.rows, { header: template.headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, template.sheetName);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

module.exports = async function importRoutes(fastify) {
  fastify.get('/template/:templateKey', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { templateKey } = request.params;
    const template = TEMPLATE_DEFINITIONS[templateKey];

    if (!template) {
      return reply.code(404).send({ error: 'Bilinmeyen template anahtari.' });
    }

    const buffer = buildTemplateBuffer(template);

    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${template.fileName}"`)
      .send(buffer);
  });

  // 1) Product Master Import
  fastify.post('/urun-master', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const triggerPricing = parseBool(data.fields?.triggerPricing?.value, true);
    const defaultKarBeklentisiRaw = parseNum(data.fields?.defaultKarBeklentisi?.value ?? '0.30');
    const defaultKarBeklentisi = Number.isFinite(defaultKarBeklentisiRaw) ? defaultKarBeklentisiRaw : 0.30;

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'urunler');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const stokKodu = String(row.stok_kodu || '').trim();
      const barkod = String(row.barkod || '').trim();
      const urunAdi = String(row.urun_adi || '').trim();
      const markaAdi = String(row.marka_adi || '').trim();
      const kategoriAdi = String(row.kategori_adi || '').trim();
      const maliyet = parseNum(row.maliyet);
      const resimUrl = String(row.resim_url || '').trim();
      const genderRaw = String(row.cinsiyetler || row.cinsiyet || '').trim();

      const rowErrors = [];
      if (!stokKodu) rowErrors.push('stok_kodu zorunlu');
      if (!urunAdi) rowErrors.push('urun_adi zorunlu');
      if (!markaAdi) rowErrors.push('marka_adi zorunlu');
      if (!kategoriAdi) rowErrors.push('kategori_adi zorunlu');
      if (!Number.isFinite(maliyet) || maliyet <= 0) rowErrors.push('maliyet pozitif sayi olmali');

      const genders = (genderRaw || 'Unisex')
        .split(/[;,|]/)
        .map((g) => normalizeGenderName(g))
        .filter(Boolean);

      if (!genders.length) rowErrors.push('cinsiyetler alani gecersiz');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        stokKodu,
        barkod: barkod || null,
        urunAdi,
        markaAdi,
        kategoriAdi,
        maliyet,
        resimUrl: resimUrl || null,
        genders: [...new Set(genders)],
      });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => r.stokKodu, 'stok_kodu'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

      // Validate foreign key dependencies
      const fkValidation = await validateStokDependencies(normalizedRows);
      if (!fkValidation.valid) {
        return reply.code(400).send({
          success: false,
          dryRun: true,
          message: 'Gerekli referans veriler eksiktir. Oncesinde bu tabloları seed etmelisiniz.',
          missingDependencies: fkValidation.missingDependencies,
          instruction: 'Lutfen asagidaki tabloları kontrol edip eksik verileri eklemelisiniz:',
          details: {
            ...(fkValidation.missingDependencies.urunler.length > 0 && {
              'Eksik Urunler (stok_kodu)': fkValidation.missingDependencies.urunler,
            }),
            ...(fkValidation.missingDependencies.beden.length > 0 && {
              'Eksik Bedenler (beden_adi)': fkValidation.missingDependencies.beden,
            }),
          },
        });
      }

    const t = await sequelize.transaction();
    let touchedKanalUrunIds = [];
    try {
      const markaCache = new Map();
      const kategoriCache = new Map();
      const cinsiyetRows = await Cinsiyet.findAll({ transaction: t });
      const cinsiyetMap = new Map(cinsiyetRows.map((c) => [c.cinsiyet_adi, c]));

      let createdCount = 0;
      let updatedCount = 0;
      let updatedGenderLinks = 0;

      for (const item of normalizedRows) {
        let marka = markaCache.get(item.markaAdi);
        if (!marka) {
          marka = await Marka.findOne({ where: { marka_adi: item.markaAdi }, transaction: t });
          if (!marka) throw new Error(`Marka bulunamadi: ${item.markaAdi}`);
          markaCache.set(item.markaAdi, marka);
        }

        let kategori = kategoriCache.get(item.kategoriAdi);
        if (!kategori) {
          kategori = await Kategori.findOne({ where: { kategori_adi: item.kategoriAdi }, transaction: t });
          if (!kategori) throw new Error(`Kategori bulunamadi: ${item.kategoriAdi}`);
          kategoriCache.set(item.kategoriAdi, kategori);
        }

        const existing = await Urun.findOne({ where: { stok_kodu: item.stokKodu }, transaction: t });
        let urun;

        if (existing) {
          urun = existing;
          await urun.update({
            barkod: item.barkod,
            urun_adi: item.urunAdi,
            kategori_id: kategori.kategori_id,
            marka_id: marka.marka_id,
            maliyet: item.maliyet,
            resim_url: item.resimUrl,
          }, { transaction: t });
          updatedCount += 1;
        } else {
          urun = await Urun.create({
            barkod: item.barkod,
            stok_kodu: item.stokKodu,
            urun_adi: item.urunAdi,
            kategori_id: kategori.kategori_id,
            marka_id: marka.marka_id,
            maliyet: item.maliyet,
            resim_url: item.resimUrl,
          }, { transaction: t });
          createdCount += 1;
        }

        const targetGenderIds = item.genders.map((g) => {
          const c = cinsiyetMap.get(g);
          if (!c) throw new Error(`Cinsiyet tanimi bulunamadi: ${g}`);
          return c.cinsiyet_id;
        });

        await UrunCinsiyet.destroy({ where: { urun_id: urun.urun_id }, transaction: t });
        await UrunCinsiyet.bulkCreate(
          targetGenderIds.map((cinsiyetId) => ({ urun_id: urun.urun_id, cinsiyet_id: cinsiyetId })),
          { transaction: t }
        );
        updatedGenderLinks += 1;

        const kanalRows = await KanalUrun.findAll({ where: { urun_id: urun.urun_id }, transaction: t });
        touchedKanalUrunIds.push(...kanalRows.map((k) => k.kanal_urun_id));
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'urunler',
        kayit_id: String(normalizedRows.length),
        aciklama: `Urun master import commit: ${normalizedRows.length} satir, ${createdCount} yeni, ${updatedCount} guncelleme, ${updatedGenderLinks} cinsiyet bagi.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      const pricingStats = triggerPricing
        ? await triggerPricingForKanalUrunIds(touchedKanalUrunIds)
        : { generated: 0, skipped: 0 };

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        updatedGenderLinks,
        impactedKanalUrunCount: [...new Set(touchedKanalUrunIds)].length,
        pricingTriggered: triggerPricing,
        pricingGeneratedCount: pricingStats.generated,
        pricingSkippedCount: pricingStats.skipped,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // 2) Stock Import
  fastify.post('/stok', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const triggerPricing = parseBool(data.fields?.triggerPricing?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'stok');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const stokKodu = String(row.stok_kodu || '').trim();
      const bedenAdi = String(row.beden_adi || '').trim();
      const stokMiktari = parseInt(String(row.stok_miktari || '').trim(), 10);
      const stokKatsayisi = parseNum(row.stok_katsayisi);

      const rowErrors = [];
      if (!stokKodu) rowErrors.push('stok_kodu zorunlu');
      if (!bedenAdi) rowErrors.push('beden_adi zorunlu');
      if (!Number.isInteger(stokMiktari) || stokMiktari < 0) rowErrors.push('stok_miktari 0 veya pozitif tam sayi olmali');
      if (stokKatsayisi !== null && stokKatsayisi <= 0) rowErrors.push('stok_katsayisi pozitif olmali');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({ row: rowNumber, stokKodu, bedenAdi, stokMiktari, stokKatsayisi });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => `${r.stokKodu}::${r.bedenAdi}`, 'stok_kodu+beden_adi'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

      // Validate foreign key dependencies
      const fkValidation = await validateRakipFiyatlarDependencies(normalizedRows);
      if (!fkValidation.valid) {
        return reply.code(400).send({
          success: false,
          dryRun: true,
          message: 'Gerekli referans veriler eksiktir. Oncesinde bu tabloları seed etmelisiniz.',
          missingDependencies: fkValidation.missingDependencies,
          instruction: 'Lutfen asagidaki tabloları kontrol edip eksik verileri eklemelisiniz:',
          details: {
            ...(fkValidation.missingDependencies.urunler.length > 0 && {
              'Eksik Urunler (stok_kodu)': fkValidation.missingDependencies.urunler,
            }),
            ...(fkValidation.missingDependencies.rakipler.length > 0 && {
              'Eksik Rakipler (rakip_adi)': fkValidation.missingDependencies.rakipler,
            }),
            ...(fkValidation.missingDependencies.kanallar.length > 0 && {
              'Eksik Kanallar (kanal_adi)': fkValidation.missingDependencies.kanallar,
            }),
            ...(fkValidation.missingDependencies.beden.length > 0 && {
              'Eksik Bedenler (beden_adi)': fkValidation.missingDependencies.beden,
            }),
          },
        });
      }

    const t = await sequelize.transaction();
    let touchedUrunIds = [];
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of normalizedRows) {
        const urun = await Urun.findOne({ where: { stok_kodu: item.stokKodu }, transaction: t });
        if (!urun) throw new Error(`Urun bulunamadi: ${item.stokKodu}`);

        let beden = await Beden.findOne({ where: { beden_adi: item.bedenAdi }, transaction: t });
        if (!beden) throw new Error(`Beden bulunamadi: ${item.bedenAdi}`);

        const existing = await Stok.findOne({ where: { urun_id: urun.urun_id, beden_id: beden.beden_id }, transaction: t });

        if (existing) {
          await existing.update({
            stok_miktari: item.stokMiktari,
            ...(item.stokKatsayisi !== null ? { stok_katsayisi: item.stokKatsayisi } : {}),
          }, { transaction: t });
          updatedCount += 1;
        } else {
          await Stok.create({
            urun_id: urun.urun_id,
            beden_id: beden.beden_id,
            stok_miktari: item.stokMiktari,
            stok_katsayisi: item.stokKatsayisi !== null ? item.stokKatsayisi : 1.0,
          }, { transaction: t });
          createdCount += 1;
        }

        touchedUrunIds.push(urun.urun_id);
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'stok',
        kayit_id: String(normalizedRows.length),
        aciklama: `Stok import commit: ${normalizedRows.length} satir, ${createdCount} yeni, ${updatedCount} guncelleme.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      const kanalRows = await KanalUrun.findAll({ where: { urun_id: { [Op.in]: [...new Set(touchedUrunIds)] } } });
      const touchedKanalUrunIds = kanalRows.map((k) => k.kanal_urun_id);

      const pricingStats = triggerPricing
        ? await triggerPricingForKanalUrunIds(touchedKanalUrunIds)
        : { generated: 0, skipped: 0 };

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        impactedKanalUrunCount: [...new Set(touchedKanalUrunIds)].length,
        pricingTriggered: triggerPricing,
        pricingGeneratedCount: pricingStats.generated,
        pricingSkippedCount: pricingStats.skipped,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // 3) Channel Price Import
  fastify.post('/kanal-fiyat', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const triggerPricing = parseBool(data.fields?.triggerPricing?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'kanal_fiyat');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const kanalAdi = String(row.kanal_adi || '').trim();
      const stokKodu = String(row.stok_kodu || '').trim();
      const webListe = parseNum(row.web_liste_fiyati);
      const webIndirim = parseNum(row.web_indirim_fiyati);
      const pyListe = parseNum(row.pazaryeri_liste_fiyat);
      const pyIndirim = parseNum(row.pazaryeri_indirim_fiyat);

      const rowErrors = [];
      if (!kanalAdi) rowErrors.push('kanal_adi zorunlu');
      if (!stokKodu) rowErrors.push('stok_kodu zorunlu');
      if ([webListe, webIndirim, pyListe, pyIndirim].some((n) => n !== null && n <= 0)) {
        rowErrors.push('fiyat alanlari pozitif olmali');
      }

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        kanalAdi,
        stokKodu,
        webListe,
        webIndirim,
        pyListe,
        pyIndirim,
      });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => `${r.kanalAdi}::${r.stokKodu}`, 'kanal_adi+stok_kodu'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

      // Validate foreign key dependencies
      const fkValidation = await validateSatislarDependencies(normalizedRows);
      if (!fkValidation.valid) {
        return reply.code(400).send({
          success: false,
          dryRun: true,
          message: 'Gerekli referans veriler eksiktir. Oncesinde bu tabloları seed etmelisiniz.',
          missingDependencies: fkValidation.missingDependencies,
          instruction: 'Lutfen asagidaki tabloları kontrol edip eksik verileri eklemelisiniz:',
          details: {
            ...(fkValidation.missingDependencies.urunler.length > 0 && {
              'Eksik Urunler (stok_kodu)': fkValidation.missingDependencies.urunler,
            }),
            ...(fkValidation.missingDependencies.kanallar.length > 0 && {
              'Eksik Kanallar (kanal_adi)': fkValidation.missingDependencies.kanallar,
            }),
            ...(fkValidation.missingDependencies.kanal_urun.length > 0 && {
              'Eksik Urun-Kanal Iliskilendirmeler': fkValidation.missingDependencies.kanal_urun,
            }),
          },
        });
      }

    const t = await sequelize.transaction();
    let touchedKanalUrunIds = [];
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of normalizedRows) {
        const kanal = await Kanal.findOne({ where: { kanal_adi: item.kanalAdi }, transaction: t });
        if (!kanal) throw new Error(`Kanal bulunamadi: ${item.kanalAdi}`);

        if (kanal.kanal_sahibi && item.webListe === null && item.webIndirim === null) {
          throw new Error(`Web kanalinda web_liste_fiyati veya web_indirim_fiyati zorunlu: ${item.kanalAdi} / ${item.stokKodu}`);
        }
        if (!kanal.kanal_sahibi && item.pyListe === null && item.pyIndirim === null) {
          throw new Error(`Pazaryeri kanalinda pazaryeri_liste_fiyat veya pazaryeri_indirim_fiyat zorunlu: ${item.kanalAdi} / ${item.stokKodu}`);
        }

        const urun = await Urun.findOne({ where: { stok_kodu: item.stokKodu }, transaction: t });
        if (!urun) throw new Error(`Urun bulunamadi: ${item.stokKodu}`);

        const payload = kanal.kanal_sahibi
          ? {
              web_liste_fiyati: item.webListe,
              web_indirim_fiyati: item.webIndirim,
            }
          : {
              pazaryeri_liste_fiyat: item.pyListe,
              pazaryeri_indirim_fiyat: item.pyIndirim,
            };

        const existing = await KanalUrun.findOne({ where: { kanal_id: kanal.kanal_id, urun_id: urun.urun_id }, transaction: t });

        if (existing) {
          await existing.update(payload, { transaction: t });
          touchedKanalUrunIds.push(existing.kanal_urun_id);
          updatedCount += 1;
        } else {
          const created = await KanalUrun.create({ kanal_id: kanal.kanal_id, urun_id: urun.urun_id, ...payload }, { transaction: t });
          touchedKanalUrunIds.push(created.kanal_urun_id);
          createdCount += 1;
        }
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'kanal_urun',
        kayit_id: String(normalizedRows.length),
        aciklama: `Kanal fiyat import commit: ${normalizedRows.length} satir, ${createdCount} yeni, ${updatedCount} guncelleme.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      const pricingStats = triggerPricing
        ? await triggerPricingForKanalUrunIds(touchedKanalUrunIds)
        : { generated: 0, skipped: 0 };

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        impactedKanalUrunCount: [...new Set(touchedKanalUrunIds)].length,
        pricingTriggered: triggerPricing,
        pricingGeneratedCount: pricingStats.generated,
        pricingSkippedCount: pricingStats.skipped,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // ========== RAKIP FIYATLAR (Competitor Prices) ==========
  fastify.post('/rakip-fiyat', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const triggerPricing = parseBool(data.fields?.triggerPricing?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'rakip_fiyat');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const stokKodu = String(row.stok_kodu || '').trim();
      const rakipAdi = String(row.rakip_adi || '').trim();
      const kanalAdi = String(row.kanal_adi || '').trim();
      const bedenAdi = String(row.beden_adi || '').trim() || null;
      const fiyat = parseNum(row.fiyat);

      const rowErrors = [];
      if (!stokKodu) rowErrors.push('stok_kodu zorunlu');
      if (!rakipAdi) rowErrors.push('rakip_adi zorunlu');
      if (!kanalAdi) rowErrors.push('kanal_adi zorunlu');
      if (fiyat === null) rowErrors.push('fiyat zorunlu');
      if (fiyat !== null && fiyat <= 0) rowErrors.push('fiyat pozitif olmali');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        stokKodu,
        rakipAdi,
        kanalAdi,
        bedenAdi,
        fiyat,
      });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => `${r.stokKodu}::${r.rakipAdi}::${r.kanalAdi}::${r.bedenAdi || 'null'}`, 'stok_kodu+rakip_adi+kanal_adi+beden_adi'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

    const t = await sequelize.transaction();
    let impactedUrunIds = [];
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of normalizedRows) {
        const urun = await Urun.findOne({ where: { stok_kodu: item.stokKodu }, transaction: t });
        if (!urun) throw new Error(`Urun bulunamadi: ${item.stokKodu}`);

        const rakip = await Rakip.findOne({ where: { rakip_adi: item.rakipAdi }, transaction: t });
        if (!rakip) throw new Error(`Rakip bulunamadi: ${item.rakipAdi}`);

        const kanal = await Kanal.findOne({ where: { kanal_adi: item.kanalAdi }, transaction: t });
        if (!kanal) throw new Error(`Kanal bulunamadi: ${item.kanalAdi}`);

        let beden_id = null;
        if (item.bedenAdi) {
          const beden = await Beden.findOne({ where: { beden_adi: item.bedenAdi }, transaction: t });
          if (!beden) throw new Error(`Beden bulunamadi: ${item.bedenAdi}`);
          beden_id = beden.beden_id;
        }

        // Append-only history: keep every uploaded competitor price snapshot.
        await RakipFiyat.create({
          urun_id: urun.urun_id,
          rakip_id: rakip.rakip_id,
          kanal_id: kanal.kanal_id,
          beden_id: beden_id,
          fiyat: item.fiyat,
          veri_kazima_zamani: new Date(),
        }, { transaction: t });
        createdCount += 1;

        if (!impactedUrunIds.includes(urun.urun_id)) {
          impactedUrunIds.push(urun.urun_id);
        }
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'rakip_fiyatlar',
        kayit_id: String(normalizedRows.length),
        aciklama: `Rakip fiyat import commit: ${normalizedRows.length} satir, ${createdCount} yeni snapshot, ${updatedCount} guncelleme.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      // Get all kanal_urun combinations for impacted products
      let touchedKanalUrunIds = [];
      if (triggerPricing && impactedUrunIds.length > 0) {
        const affectedKanalUrunRecords = await KanalUrun.findAll({
          where: { urun_id: { [Op.in]: impactedUrunIds } },
        });
        touchedKanalUrunIds = affectedKanalUrunRecords.map((ku) => ku.kanal_urun_id);
      }

      const pricingStats = triggerPricing && touchedKanalUrunIds.length > 0
        ? await triggerPricingForKanalUrunIds(touchedKanalUrunIds)
        : { generated: 0, skipped: 0 };

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        impactedUrunCount: impactedUrunIds.length,
        impactedKanalUrunCount: touchedKanalUrunIds.length,
        pricingTriggered: triggerPricing,
        pricingGeneratedCount: pricingStats.generated,
        pricingSkippedCount: pricingStats.skipped,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // ========== SATISLAR (Sales Transactions) ==========
  fastify.post('/satislar', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);
    const triggerPricing = parseBool(data.fields?.triggerPricing?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'satislar');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const stokKodu = String(row.stok_kodu || '').trim();
      const kanalAdi = String(row.kanal_adi || '').trim();
      const satisMiktari = parseInt(row.satis_miktari || '1', 10);
      const birimFiyat = parseNum(row.birim_fiyat);
      const maliyetSnapshot = parseNum(row.maliyet_snapshot);
      const satisTarihi = row.satis_tarihi ? new Date(row.satis_tarihi) : new Date();

      const rowErrors = [];
      if (!stokKodu) rowErrors.push('stok_kodu zorunlu');
      if (!kanalAdi) rowErrors.push('kanal_adi zorunlu');
      if (isNaN(satisMiktari) || satisMiktari <= 0) rowErrors.push('satis_miktari pozitif bir sayi olmali');
      if (birimFiyat === null) rowErrors.push('birim_fiyat zorunlu');
      if (birimFiyat !== null && birimFiyat <= 0) rowErrors.push('birim_fiyat pozitif olmali');
      if (maliyetSnapshot === null) rowErrors.push('maliyet_snapshot zorunlu');
      if (maliyetSnapshot !== null && maliyetSnapshot < 0) rowErrors.push('maliyet_snapshot negatif olamaz');
      if (isNaN(satisTarihi.getTime())) rowErrors.push('satis_tarihi gecersiz format');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        stokKodu,
        kanalAdi,
        satisMiktari,
        birimFiyat,
        maliyetSnapshot,
        satisTarihi,
      });
    });

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

    const t = await sequelize.transaction();
    try {
      let createdCount = 0;
      const touchedKanalUrunIds = [];

      for (const item of normalizedRows) {
        const urun = await Urun.findOne({ where: { stok_kodu: item.stokKodu }, transaction: t });
        if (!urun) throw new Error(`Urun bulunamadi: ${item.stokKodu}`);

        const kanal = await Kanal.findOne({ where: { kanal_adi: item.kanalAdi }, transaction: t });
        if (!kanal) throw new Error(`Kanal bulunamadi: ${item.kanalAdi}`);

        const kanalUrun = await KanalUrun.findOne({
          where: { kanal_id: kanal.kanal_id, urun_id: urun.urun_id },
          transaction: t,
        });
        if (!kanalUrun) {
          throw new Error(`Urun bu kanalda satilmamaktadir: ${item.stokKodu} / ${item.kanalAdi}`);
        }

        // Create new sales record (append-only, no duplicates check for historical data)
        await Satis.create({
          kanal_urun_id: kanalUrun.kanal_urun_id,
          satis_miktari: item.satisMiktari,
          birim_fiyat: item.birimFiyat,
          maliyet_snapshot: item.maliyetSnapshot,
          satis_tarihi: item.satisTarihi,
        }, { transaction: t });
        createdCount += 1;

        touchedKanalUrunIds.push(kanalUrun.kanal_urun_id);
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'satislar',
        kayit_id: String(normalizedRows.length),
        aciklama: `Satis import commit: ${normalizedRows.length} satir, ${createdCount} yeni kayit.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      const uniqueKanalUrunIds = [...new Set(touchedKanalUrunIds)];
      const pricingStats = triggerPricing && uniqueKanalUrunIds.length > 0
        ? await triggerPricingForKanalUrunIds(uniqueKanalUrunIds)
        : { generated: 0, skipped: 0 };

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        impactedKanalUrunCount: uniqueKanalUrunIds.length,
        pricingTriggered: triggerPricing,
        pricingGeneratedCount: pricingStats.generated,
        pricingSkippedCount: pricingStats.skipped,
        message: `${createdCount} satis kaydı başarıyla import edildi.`,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // ========== FIYATLANDIRMA KURALLARI (Pricing Rules) ==========
  fastify.post('/fiyatlandirma-kurali', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'fiyatlandirma_kurali');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const kanalAdi = String(row.kanal_adi || '').trim();
      const kategoriAdi = String(row.kategori_adi || '').trim();
      const komisyonOrani = parseNum(row.komisyon_orani);
      const lojistikGideri = parseNum(row.lojistik_gideri);
      const kargoUcreti = parseNum(row.kargo_ucreti);
      const maxIndirim = parseNum(row.max_indirim);
      const minKar = parseNum(row.min_kar);
      const rekabetKatsayisi = parseNum(row.rekabet_katsayisi);
      const geriGelinebilecekYuzde = parseNum(row.geri_gelinebilecek_yuzde);
      const aylikSatisHedefi = parseNum(row.aylik_satis_hedefi);
      const haftalikSatisHedefi = parseNum(row.haftalik_satis_hedefi);
      const aktiflikDurumu = parseBool(row.aktiflik_durumu, true);
      const gecerlilik_baslangic = row.gecerlilik_baslangic ? new Date(row.gecerlilik_baslangic) : new Date();
      const gecerlilik_bitis = row.gecerlilik_bitis ? new Date(row.gecerlilik_bitis) : null;

      const rowErrors = [];
      if (!kanalAdi) rowErrors.push('kanal_adi zorunlu');
      if (!kategoriAdi) rowErrors.push('kategori_adi zorunlu');
      if (komisyonOrani === null) rowErrors.push('komisyon_orani zorunlu');
      if (komisyonOrani !== null && (komisyonOrani < 0 || komisyonOrani > 1)) rowErrors.push('komisyon_orani 0-1 arasinda olmali');
      if (lojistikGideri !== null && lojistikGideri < 0) rowErrors.push('lojistik_gideri negatif olamaz');
      if (kargoUcreti !== null && kargoUcreti < 0) rowErrors.push('kargo_ucreti negatif olamaz');
      if (maxIndirim === null) rowErrors.push('max_indirim zorunlu');
      if (maxIndirim !== null && (maxIndirim < 0 || maxIndirim > 1)) rowErrors.push('max_indirim 0-1 arasinda olmali');
      if (minKar === null) rowErrors.push('min_kar zorunlu');
      if (minKar !== null && (minKar < 0 || minKar > 1)) rowErrors.push('min_kar 0-1 arasinda olmali');
      if (rekabetKatsayisi !== null && (rekabetKatsayisi < 0.5 || rekabetKatsayisi > 1.5)) rowErrors.push('rekabet_katsayisi 0.5-1.5 arasinda olmali');
      if (geriGelinebilecekYuzde !== null && (geriGelinebilecekYuzde < 0 || geriGelinebilecekYuzde > 1)) rowErrors.push('geri_gelinebilecek_yuzde 0-1 arasinda olmali');
      if (aylikSatisHedefi !== null && aylikSatisHedefi < 0) rowErrors.push('aylik_satis_hedefi negatif olamaz');
      if (haftalikSatisHedefi !== null && haftalikSatisHedefi < 0) rowErrors.push('haftalik_satis_hedefi negatif olamaz');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        kanalAdi,
        kategoriAdi,
        komisyonOrani,
        lojistikGideri,
        kargoUcreti,
        maxIndirim,
        minKar,
        rekabetKatsayisi,
        geriGelinebilecekYuzde,
        aylikSatisHedefi,
        haftalikSatisHedefi,
        aktiflikDurumu,
        gecerlilik_baslangic,
        gecerlilik_bitis,
      });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => `${r.kanalAdi}::${r.kategoriAdi}`, 'kanal_adi+kategori_adi'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

    const t = await sequelize.transaction();
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of normalizedRows) {
        const kanal = await Kanal.findOne({ where: { kanal_adi: item.kanalAdi }, transaction: t });
        if (!kanal) throw new Error(`Kanal bulunamadi: ${item.kanalAdi}`);

        const kategori = await Kategori.findOne({ where: { kategori_adi: item.kategoriAdi }, transaction: t });
        if (!kategori) throw new Error(`Kategori bulunamadi: ${item.kategoriAdi}`);

        const existing = await FiyatlandirmaKurali.findOne({
          where: { kanal_id: kanal.kanal_id, kategori_id: kategori.kategori_id },
          transaction: t,
        });

        const payload = {
          komisyon_orani: item.komisyonOrani,
          lojistik_gideri: item.lojistikGideri || 0,
          kargo_ucreti: item.kargoUcreti || 0,
          max_indirim: item.maxIndirim,
          min_kar: item.minKar,
          rekabet_katsayisi: item.rekabetKatsayisi || 1.0,
          geri_gelinebilecek_yuzde: item.geriGelinebilecekYuzde,
          aylik_satis_hedefi: item.aylikSatisHedefi,
          haftalik_satis_hedefi: item.haftalikSatisHedefi,
          aktiflik_durumu: item.aktiflikDurumu ? 1 : 0,
          gecerlilik_baslangic: item.gecerlilik_baslangic,
          gecerlilik_bitis: item.gecerlilik_bitis,
        };

        if (existing) {
          await existing.update(payload, { transaction: t });
          updatedCount += 1;
        } else {
          await FiyatlandirmaKurali.create({
            kanal_id: kanal.kanal_id,
            kategori_id: kategori.kategori_id,
            ...payload,
          }, { transaction: t });
          createdCount += 1;
        }
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'fiyatlandirma_kurallari',
        kayit_id: String(normalizedRows.length),
        aciklama: `Fiyatlandirma kurali import commit: ${normalizedRows.length} satir, ${createdCount} yeni, ${updatedCount} guncelleme.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        message: `${createdCount} yeni, ${updatedCount} güncellenmiş fiyatlandırma kuralı.`,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  // ========== KAMPANYA PLANLARI (Campaign Plans) ==========
  fastify.post('/kampanya', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'Excel dosyasi gerekli (file).' });

    const dryRun = parseBool(data.fields?.dryRun?.value, true);

    const buffer = await data.toBuffer();
    const rows = parseRowsFromWorkbook(buffer, 'kampanya');
    if (!rows.length) return reply.code(400).send({ error: 'Excel dosyasi bos veya uygun satir bulunamadi.' });

    const validationErrors = [];
    const normalizedRows = [];

    rows.forEach((row, idx) => {
      const rowNumber = idx + 2;
      const kanalAdi = String(row.kanal_adi || '').trim();
      const kampanyaAdi = String(row.kampanya_adi || '').trim();
      const baslangicTarihi = row.baslangic_tarihi ? new Date(row.baslangic_tarihi) : null;
      const bitisTarihi = row.bitis_tarihi ? new Date(row.bitis_tarihi) : null;
      const hedefIndirimOrani = parseNum(row.hedef_indirim_orani);
      const hedefKarlilik = parseNum(row.hedef_karlilik);
      const sezonAdi = String(row.sezon_adi || '').trim() || null;

      const rowErrors = [];
      if (!kanalAdi) rowErrors.push('kanal_adi zorunlu');
      if (!kampanyaAdi) rowErrors.push('kampanya_adi zorunlu');
      if (!baslangicTarihi || isNaN(baslangicTarihi.getTime())) rowErrors.push('baslangic_tarihi zorunlu ve gecerli olmali');
      if (!bitisTarihi || isNaN(bitisTarihi.getTime())) rowErrors.push('bitis_tarihi zorunlu ve gecerli olmali');
      if (baslangicTarihi && bitisTarihi && baslangicTarihi > bitisTarihi) rowErrors.push('baslangic_tarihi, bitis_tarihinden once olmali');
      if (hedefIndirimOrani === null) rowErrors.push('hedef_indirim_orani zorunlu');
      if (hedefIndirimOrani !== null && (hedefIndirimOrani < 0 || hedefIndirimOrani > 1)) rowErrors.push('hedef_indirim_orani 0-1 arasinda olmali');
      if (hedefKarlilik === null) rowErrors.push('hedef_karlilik zorunlu');
      if (hedefKarlilik !== null && (hedefKarlilik < 0 || hedefKarlilik > 1)) rowErrors.push('hedef_karlilik 0-1 arasinda olmali');

      if (rowErrors.length) {
        validationErrors.push({ row: rowNumber, errors: rowErrors });
        return;
      }

      normalizedRows.push({
        row: rowNumber,
        kanalAdi,
        kampanyaAdi,
        baslangicTarihi,
        bitisTarihi,
        hedefIndirimOrani,
        hedefKarlilik,
        sezonAdi,
      });
    });

    validationErrors.push(...validateDuplicate(normalizedRows, (r) => `${r.kanalAdi}::${r.kampanyaAdi}`, 'kanal_adi+kampanya_adi'));

    if (validationErrors.length > 0) {
      return reply.code(400).send({
        success: false,
        dryRun: true,
        message: 'Validasyon hatalari var. Kayit yapilmadi.',
        totalRows: rows.length,
        validRows: normalizedRows.length,
        invalidRows: validationErrors.length,
        errors: validationErrors,
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
        preview: normalizedRows.slice(0, 10),
      };
    }

    const t = await sequelize.transaction();
    try {
      let createdCount = 0;
      let updatedCount = 0;

      for (const item of normalizedRows) {
        const kanal = await Kanal.findOne({ where: { kanal_adi: item.kanalAdi }, transaction: t });
        if (!kanal) throw new Error(`Kanal bulunamadi: ${item.kanalAdi}`);

        let sezon_id = null;
        if (item.sezonAdi) {
          const sezon = await Sezon.findOne({ where: { sezon_adi: item.sezonAdi }, transaction: t });
          if (!sezon) throw new Error(`Sezon bulunamadi: ${item.sezonAdi}`);
          sezon_id = sezon.sezon_id;
        }

        const existing = await KampanyaPlan.findOne({
          where: { kanal_id: kanal.kanal_id, kampanya_adi: item.kampanyaAdi },
          transaction: t,
        });

        const payload = {
          baslangic_tarihi: item.baslangicTarihi,
          bitis_tarihi: item.bitisTarihi,
          hedef_indirim_orani: item.hedefIndirimOrani,
          hedef_karlilik: item.hedefKarlilik,
          sezon_id: sezon_id,
        };

        if (existing) {
          await existing.update(payload, { transaction: t });
          updatedCount += 1;
        } else {
          await KampanyaPlan.create({
            kanal_id: kanal.kanal_id,
            kampanya_adi: item.kampanyaAdi,
            ...payload,
          }, { transaction: t });
          createdCount += 1;
        }
      }

      await IslemLog.create({
        kullanici_id: request.user?.kullanici_id || null,
        islem_tipi: 'IMPORT',
        tablo_adi: 'kampanya_planlari',
        kayit_id: String(normalizedRows.length),
        aciklama: `Kampanya import commit: ${normalizedRows.length} satir, ${createdCount} yeni, ${updatedCount} guncelleme.`,
        ip_adresi: request.ip,
      }, { transaction: t });

      await t.commit();

      return {
        success: true,
        dryRun: false,
        totalRows: rows.length,
        processedRows: normalizedRows.length,
        createdCount,
        updatedCount,
        message: `${createdCount} yeni, ${updatedCount} güncellenmiş kampanya.`,
      };
    } catch (error) {
      await t.rollback();
      return reply.code(400).send({ success: false, error: error.message });
    }
  });
};
