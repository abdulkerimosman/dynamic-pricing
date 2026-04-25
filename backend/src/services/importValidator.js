'use strict';

/**
 * Import Validator Service
 * Validates foreign key dependencies for Tier 2 (operational) imports:
 * - stok (requires: urunler, beden)
 * - rakip_fiyatlar (requires: urunler, rakipler, kanallar, beden)
 * - satislar (requires: urunler, kanallar, kanal_urun)
 */

const { Urun, Beden, Rakip, Kanal, KanalUrun } = require('../models');

/**
 * Validate stok import dependencies
 * @returns { valid: boolean, missingDependencies: object }
 */
async function validateStokDependencies(normalizedRows) {
  const missingDependencies = {
    urunler: [],
    beden: [],
  };

  const stokKodusToCheck = [...new Set(normalizedRows.map(r => r.stokKodu))];
  const bedenAdiToCheck = [...new Set(normalizedRows.map(r => r.bedenAdi))];

  // Check urunler
  const foundUrunler = await Urun.findAll({
    where: { stok_kodu: stokKodusToCheck },
    attributes: ['urun_id', 'stok_kodu'],
  });
  const foundUrunStokKodus = new Set(foundUrunler.map(u => u.stok_kodu));
  missingDependencies.urunler = stokKodusToCheck.filter(k => !foundUrunStokKodus.has(k));

  // Check beden
  const foundBeden = await Beden.findAll({
    where: { beden_adi: bedenAdiToCheck },
    attributes: ['beden_id', 'beden_adi'],
  });
  const foundBedenAdis = new Set(foundBeden.map(b => b.beden_adi));
  missingDependencies.beden = bedenAdiToCheck.filter(a => !foundBedenAdis.has(a));

  const valid = missingDependencies.urunler.length === 0 && missingDependencies.beden.length === 0;

  return { valid, missingDependencies };
}

/**
 * Validate rakip_fiyatlar import dependencies
 */
async function validateRakipFiyatlarDependencies(normalizedRows) {
  const missingDependencies = {
    urunler: [],
    rakipler: [],
    kanallar: [],
    beden: [],
  };

  const stokKodusToCheck = [...new Set(normalizedRows.map(r => r.stokKodu))];
  const rakipAdiToCheck = [...new Set(normalizedRows.map(r => r.rakipAdi))];
  const kanalAdiToCheck = [...new Set(normalizedRows.map(r => r.kanalAdi))];
  const bedenAdiToCheck = [...new Set(normalizedRows
    .filter(r => r.bedenAdi)
    .map(r => r.bedenAdi))];

  // Check urunler
  const foundUrunler = await Urun.findAll({
    where: { stok_kodu: stokKodusToCheck },
    attributes: ['urun_id', 'stok_kodu'],
  });
  const foundUrunStokKodus = new Set(foundUrunler.map(u => u.stok_kodu));
  missingDependencies.urunler = stokKodusToCheck.filter(k => !foundUrunStokKodus.has(k));

  // Check rakipler
  const foundRakipler = await Rakip.findAll({
    where: { rakip_adi: rakipAdiToCheck },
    attributes: ['rakip_id', 'rakip_adi'],
  });
  const foundRakipAdis = new Set(foundRakipler.map(r => r.rakip_adi));
  missingDependencies.rakipler = rakipAdiToCheck.filter(a => !foundRakipAdis.has(a));

  // Check kanallar
  const foundKanallar = await Kanal.findAll({
    where: { kanal_adi: kanalAdiToCheck },
    attributes: ['kanal_id', 'kanal_adi'],
  });
  const foundKanalAdis = new Set(foundKanallar.map(k => k.kanal_adi));
  missingDependencies.kanallar = kanalAdiToCheck.filter(a => !foundKanalAdis.has(a));

  // Check beden (if provided)
  if (bedenAdiToCheck.length > 0) {
    const foundBeden = await Beden.findAll({
      where: { beden_adi: bedenAdiToCheck },
      attributes: ['beden_id', 'beden_adi'],
    });
    const foundBedenAdis = new Set(foundBeden.map(b => b.beden_adi));
    missingDependencies.beden = bedenAdiToCheck.filter(a => !foundBedenAdis.has(a));
  }

  const valid = Object.values(missingDependencies).every(arr => arr.length === 0);

  return { valid, missingDependencies };
}

/**
 * Validate satislar import dependencies
 */
async function validateSatislarDependencies(normalizedRows) {
  const missingDependencies = {
    urunler: [],
    kanallar: [],
    kanal_urun: [],
  };

  const stokKodusToCheck = [...new Set(normalizedRows.map(r => r.stokKodu))];
  const kanalAdiToCheck = [...new Set(normalizedRows.map(r => r.kanalAdi))];

  // Check urunler
  const foundUrunler = await Urun.findAll({
    where: { stok_kodu: stokKodusToCheck },
    attributes: ['urun_id', 'stok_kodu'],
  });
  const foundUrunMap = new Map(foundUrunler.map(u => [u.stok_kodu, u.urun_id]));
  const missingUrunler = stokKodusToCheck.filter(k => !foundUrunMap.has(k));
  missingDependencies.urunler = missingUrunler;

  // Check kanallar
  const foundKanallar = await Kanal.findAll({
    where: { kanal_adi: kanalAdiToCheck },
    attributes: ['kanal_id', 'kanal_adi'],
  });
  const foundKanalMap = new Map(foundKanallar.map(k => [k.kanal_adi, k.kanal_id]));
  const missingKanallar = kanalAdiToCheck.filter(a => !foundKanalMap.has(a));
  missingDependencies.kanallar = missingKanallar;

  // Check kanal_urun combinations (only for rows with valid urunler + kanallar)
  if (missingUrunler.length === 0 && missingKanallar.length === 0) {
    const combosToCheck = [...new Set(normalizedRows.map(r => `${r.stokKodu}::${r.kanalAdi}`))];
    const foundKanalUruns = await KanalUrun.findAll({
      include: [
        { model: Urun, where: { stok_kodu: stokKodusToCheck } },
        { model: Kanal, where: { kanal_adi: kanalAdiToCheck } },
      ],
      attributes: ['kanal_urun_id', 'urun_id', 'kanal_id'],
      raw: true,
    });

    const foundCombos = new Set();
    foundKanalUruns.forEach(ku => {
      const urunStokKodu = foundUrunler.find(u => u.urun_id === ku.urun_id)?.stok_kodu;
      const kanalAdi = foundKanallar.find(k => k.kanal_id === ku.kanal_id)?.kanal_adi;
      if (urunStokKodu && kanalAdi) {
        foundCombos.add(`${urunStokKodu}::${kanalAdi}`);
      }
    });

    missingDependencies.kanal_urun = combosToCheck.filter(c => !foundCombos.has(c));
  }

  const valid = Object.values(missingDependencies).every(arr => arr.length === 0);

  return { valid, missingDependencies };
}

module.exports = {
  validateStokDependencies,
  validateRakipFiyatlarDependencies,
  validateSatislarDependencies,
};
