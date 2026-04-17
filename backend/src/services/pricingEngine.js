'use strict';

/**
 * Sporthink Pricing Engine
 * Formula:
 *   Step 1: basePrice = max(cost × (1 + targetMargin), avgCompetitorPrice × compCoeff)
 *   Step 2: adjustedPrice = basePrice × stockCoeff × demandCoeff
 *   Step 3: Guardrail — if adjustedPrice < cost × (1 + minMargin) → block with alert
 */

class PricingEngine {
  /**
   * Compute a price suggestion for one kanal_urun row.
   *
   * @param {object} params
   * @param {object} params.urun             - Urun model instance (with Kategori)
   * @param {object} params.kanalUrun        - KanalUrun model instance
   * @param {object} params.kural            - FiyatlandirmaKurali for this channel+category
   * @param {object[]} params.rakipFiyatlar  - RakipFiyat rows for this product+channel
   * @param {object[]} params.stoklar        - Stok rows for this product
   * @returns {{ onerilenFiyat, minFiyat, uyarilar, neden, risk }}
   */
  compute({ urun, kanalUrun, kural, rakipFiyatlar = [], stoklar = [] }) {
    const maliyet         = parseFloat(urun.maliyet);
    const karBeklentisi   = parseFloat(urun.Kategori?.kar_beklentisi ?? 0.30);
    const komisyon        = parseFloat(kural.komisyon_orani ?? 0);
    const lojistik        = parseFloat(kural.lojistik_gideri ?? 0);
    const kargo           = parseFloat(kural.kargo_ucreti ?? 0);
    const maxIndirim      = parseFloat(kural.max_indirim ?? 0.40);
    const minKar          = parseFloat(kural.min_kar ?? 0.10);
    const rekabetKatsayisi= parseFloat(kural.rekabet_katsayisi ?? 1.0);

    // ── Step 1a: Minimum acceptable price (guardrail floor) ──────────────
    const minFiyat = Math.round((maliyet * (1 + minKar) + lojistik + kargo) * 100) / 100;

    // ── Step 1b: Target price based on category margin ───────────────────
    // On marketplace we gross up for commission
    const komisyonCarpani = komisyon > 0 ? (1 - komisyon) : 1;
    const hedefMaliyet    = (maliyet + lojistik + kargo) / komisyonCarpani;
    const hedefFiyat      = Math.round(hedefMaliyet * (1 + karBeklentisi) * 100) / 100;

    // ── Step 1c: Competitor-based target ─────────────────────────────────
    let rakipOrtalama = null;
    if (rakipFiyatlar.length > 0) {
      const toplam  = rakipFiyatlar.reduce((s, r) => s + parseFloat(r.fiyat), 0);
      rakipOrtalama = toplam / rakipFiyatlar.length;
    }

    let basePrice = hedefFiyat;
    if (rakipOrtalama !== null) {
      const rakipHedef = rakipOrtalama * rekabetKatsayisi;
      basePrice = Math.max(hedefFiyat, rakipHedef);
    }

    // ── Step 2: Apply stock coefficient ──────────────────────────────────
    const stockCoeff  = this._stockCoeff(stoklar);
    const demandCoeff = 1.0; // Placeholder — will be ML-powered in Phase ML

    let onerilenFiyat = Math.round(basePrice * stockCoeff * demandCoeff * 100) / 100;

    // ── Step 3: Guardrails ────────────────────────────────────────────────
    const uyarilar = [];
    let risk = 'normal';

    if (onerilenFiyat < minFiyat) {
      uyarilar.push('MIN_KAR_IHLALI');
      onerilenFiyat = minFiyat;
      risk = 'yuksek';
    }

    // Check max discount against current active price
    const mevcutFiyat = parseFloat(
      kanalUrun.pazaryeri_indirim_fiyat || kanalUrun.web_indirim_fiyati || 0
    );
    if (mevcutFiyat > 0) {
      const indirimOrani = (mevcutFiyat - onerilenFiyat) / mevcutFiyat;
      if (indirimOrani > maxIndirim) {
        uyarilar.push('MAX_INDIRIM_ASIDI');
        risk = 'yuksek';
      }
    }

    // Check if competitor is significantly cheaper (alert trigger)
    if (rakipOrtalama !== null && mevcutFiyat > 0) {
      const rakipFark = (mevcutFiyat - rakipOrtalama) / mevcutFiyat;
      if (rakipFark > 0.10) {
        uyarilar.push('RAKIP_COK_UCUZ');
        if (risk === 'normal') risk = 'orta';
      }
    }

    const neden = this._buildReason({
      maliyet, hedefFiyat, rakipOrtalama, rekabetKatsayisi,
      stockCoeff, onerilenFiyat, uyarilar, komisyon,
    });

    return {
      onerilenFiyat,
      minFiyat,
      uyarilar,
      neden,
      risk,
      hesapDetayi: {
        maliyet,
        hedefKarlilik: karBeklentisi,
        hedefFiyat,
        rakipFiyatOrtalamasi: rakipOrtalama,
        rekabetKatsayisi,
        stokKatsayisi: stockCoeff,
        talepKatsayisi: demandCoeff,
        komisyon,
      },
    };
  }

  /**
   * Batch generate suggestions for multiple kanal_urun rows.
   * Used by the /generate endpoint.
   */
  computeBatch(items) {
    return items.map((item) => ({ ...item, suggestion: this.compute(item) }));
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  _stockCoeff(stoklar) {
    if (!stoklar || stoklar.length === 0) return 1.0;
    const toplam = stoklar.reduce((s, st) => s + (st.stok_miktari || 0), 0);
    if (toplam > 30) return 0.95; // too much stock → discount
    if (toplam < 5)  return 1.05; // low stock → slight premium
    return 1.00;
  }

  _buildReason({ maliyet, hedefFiyat, rakipOrtalama, rekabetKatsayisi, stockCoeff, onerilenFiyat, uyarilar, komisyon }) {
    const parts = [];
    parts.push(`Maliyet: ${maliyet} TL`);
    parts.push(`Hedef fiyat (marj bazlı): ${hedefFiyat.toFixed(2)} TL`);
    if (komisyon > 0) parts.push(`Komisyon: %${(komisyon * 100).toFixed(0)}`);
    if (rakipOrtalama !== null) {
      parts.push(`Rakip ort.: ${rakipOrtalama.toFixed(2)} TL × ${rekabetKatsayisi} = ${(rakipOrtalama * rekabetKatsayisi).toFixed(2)} TL`);
    }
    if (stockCoeff !== 1.0) parts.push(`Stok katsayısı: ${stockCoeff}`);
    parts.push(`Önerilen fiyat: ${onerilenFiyat.toFixed(2)} TL`);
    if (uyarilar.length > 0) parts.push(`⚠ ${uyarilar.join(', ')}`);
    return parts.join(' | ');
  }
}

module.exports = new PricingEngine();
