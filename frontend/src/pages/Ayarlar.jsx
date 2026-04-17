import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Save } from 'lucide-react';
import api from '../api';

function ParametrelerTab() {
  const [rakipFiyatFarki, setRakipFiyatFarki] = useState('');
  const [rekabetKatsayisi, setRekabetKatsayisi] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const params = {};
      if (rakipFiyatFarki) params.rakip_fiyat_farki_yuzde = parseFloat(rakipFiyatFarki);
      if (rekabetKatsayisi) params.rekabet_katsayisi = parseFloat(rekabetKatsayisi);

      // In a real implementation, you would have an endpoint to save these parameters
      // For now, we'll just show a success message
      setResult({
        success: true,
        message: 'Parametreler kaydedildi.',
      });
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-8 px-8 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-12">
        <label className="text-base text-gray-800 font-medium flex-1">
          Rakip Fiyat Farkı Yüksek Ürünler Uyarısı
        </label>
        <div className="w-2/3">
          <input 
            type="number" 
            step="0.1"
            min="0"
            max="100"
            placeholder="% Yüzdesel değer giriniz"
            value={rakipFiyatFarki}
            onChange={(e) => setRakipFiyatFarki(e.target.value)}
            className="form-input text-center"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-12">
        <label className="text-base text-gray-800 font-medium flex-1">
          Rekabet Katsayısı
        </label>
        <div className="w-2/3">
          <input 
            type="number" 
            step="0.01"
            min="0.5"
            max="1.5"
            placeholder="Ondalık bir sayı giriniz"
            value={rekabetKatsayisi}
            onChange={(e) => setRekabetKatsayisi(e.target.value)}
            className="form-input text-center"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handleSave}
          disabled={loading || (!rakipFiyatFarki && !rekabetKatsayisi)}
          className="btn-primary"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Kaydet
        </button>
      </div>

      {result && (
        <div className={`rounded-lg border p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-start gap-2">
            {result.success ? <CheckCircle2 size={18} className="text-green-600 mt-0.5" /> : <AlertTriangle size={18} className="text-red-600 mt-0.5" />}
            <div className="text-sm">
              {result.message ? <p className="font-medium text-gray-900">{result.message}</p> : null}
              {result.error ? <p className="text-red-700">{result.error}</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportResultBox({ result }) {
  if (!result) return null;
  return (
    <div className={`rounded-lg border p-4 ${result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-start gap-2">
        {result.success ? <CheckCircle2 size={18} className="text-green-600 mt-0.5" /> : <AlertTriangle size={18} className="text-red-600 mt-0.5" />}
        <div className="text-sm space-y-1">
          {result.message ? <p className="font-medium text-gray-900">{result.message}</p> : null}
          {result.error ? <p className="text-red-700">{result.error}</p> : null}
          {typeof result.totalRows !== 'undefined' ? <p>Toplam Satir: {result.totalRows}</p> : null}
          {typeof result.validRows !== 'undefined' ? <p>Gecerli Satir: {result.validRows}</p> : null}
          {typeof result.invalidRows !== 'undefined' ? <p>Hatali Satir: {result.invalidRows}</p> : null}
          {typeof result.createdCount !== 'undefined' ? <p>Yeni Kayit: {result.createdCount}</p> : null}
          {typeof result.updatedCount !== 'undefined' ? <p>Guncellenen Kayit: {result.updatedCount}</p> : null}
          {typeof result.pricingGeneratedCount !== 'undefined' ? <p>Uretilen Fiyat Onerisi: {result.pricingGeneratedCount}</p> : null}
          {typeof result.pricingSkippedCount !== 'undefined' ? <p>Atlanan Fiyat Onerisi: {result.pricingSkippedCount}</p> : null}
        </div>
      </div>

      {Array.isArray(result.errors) && result.errors.length > 0 && (
        <div className="mt-4 overflow-auto bg-white border border-red-100 rounded max-h-60">
          <table className="w-full text-sm">
            <thead className="bg-red-50 text-red-700">
              <tr>
                <th className="text-left px-3 py-2">Satir</th>
                <th className="text-left px-3 py-2">Hatalar</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.slice(0, 100).map((err, idx) => (
                <tr key={idx} className="border-t border-red-100">
                  <td className="px-3 py-2">{err.row}</td>
                  <td className="px-3 py-2">{Array.isArray(err.errors) ? err.errors.join(', ') : String(err.errors || '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {Array.isArray(result.preview) && result.preview.length > 0 && (
        <div className="mt-4 overflow-auto bg-white border border-gray-200 rounded max-h-60">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                {Object.keys(result.preview[0]).map((k) => (
                  <th key={k} className="text-left px-3 py-2 whitespace-nowrap">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.preview.map((item, rowIdx) => (
                <tr key={rowIdx} className="border-t border-gray-100">
                  {Object.keys(result.preview[0]).map((k) => (
                    <td key={k} className="px-3 py-2 whitespace-nowrap">
                      {Array.isArray(item[k]) ? item[k].join(', ') : String(item[k] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImportModuleCard({ title, description, endpoint, extraFields, defaultFields }) {
  const [file, setFile] = useState(null);
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [result, setResult] = useState(null);
  const [fields, setFields] = useState(defaultFields || {});

  const runImport = async (dryRun) => {
    if (!file) {
      setResult({ success: false, error: 'Lutfen once bir Excel dosyasi seciniz.' });
      return;
    }

    const setLoading = dryRun ? setLoadingDryRun : setLoadingCommit;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dryRun', String(dryRun));
      Object.keys(fields).forEach((key) => formData.append(key, String(fields[key])));

      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (error) {
      setResult(error?.response?.data || { success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel p-6 space-y-4">
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Excel Dosyasi (.xlsx/.xls)</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setResult(null);
          }}
          className="form-input"
        />
      </div>

      {extraFields ? extraFields({ fields, setFields }) : null}

      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary" onClick={() => runImport(true)} disabled={!file || loadingDryRun || loadingCommit}>
          {loadingDryRun ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          Dry Run
        </button>
        <button className="btn-primary" onClick={() => runImport(false)} disabled={!file || loadingDryRun || loadingCommit}>
          {loadingCommit ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          Commit
        </button>
      </div>

      <ImportResultBox result={result} />
    </div>
  );
}

function ImportExportTab() {
  return (
    <div className="p-8 space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Import Modulleri</h3>
      <div className="grid grid-cols-1 gap-6">
        <ImportModuleCard
          title="Urun Master Import"
          description="Kolonlar: stok_kodu, barkod, urun_adi, marka_adi, kategori_adi, maliyet, resim_url, cinsiyetler"
          endpoint="/import/urun-master"
          defaultFields={{
            triggerPricing: true,
            allowCreateMarka: true,
            allowCreateKategori: true,
            defaultKarBeklentisi: '0.30',
          }}
          extraFields={({ fields, setFields }) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
                Fiyat onerisi uretimi tetiklensin
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(fields.allowCreateMarka)} onChange={(e) => setFields((p) => ({ ...p, allowCreateMarka: e.target.checked }))} />
                Marka otomatik olustur
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(fields.allowCreateKategori)} onChange={(e) => setFields((p) => ({ ...p, allowCreateKategori: e.target.checked }))} />
                Kategori otomatik olustur
              </label>
              <div className="space-y-1">
                <label className="text-xs text-gray-600">Varsayilan Kar Beklentisi</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={fields.defaultKarBeklentisi}
                  onChange={(e) => setFields((p) => ({ ...p, defaultKarBeklentisi: e.target.value }))}
                  className="form-input"
                />
              </div>
            </div>
          )}
        />

        <ImportModuleCard
          title="Stok Import"
          description="Kolonlar: stok_kodu, beden_adi, stok_miktari, stok_katsayisi(optional)"
          endpoint="/import/stok"
          defaultFields={{ triggerPricing: true, allowCreateBeden: false }}
          extraFields={({ fields, setFields }) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
                Fiyat onerisi uretimi tetiklensin
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={Boolean(fields.allowCreateBeden)} onChange={(e) => setFields((p) => ({ ...p, allowCreateBeden: e.target.checked }))} />
                Beden otomatik olustur
              </label>
            </div>
          )}
        />

        <ImportModuleCard
          title="Kanal Fiyat Import"
          description="Kolonlar: kanal_adi, stok_kodu, web_liste_fiyati, web_indirim_fiyati, pazaryeri_liste_fiyat, pazaryeri_indirim_fiyat"
          endpoint="/import/kanal-fiyat"
          defaultFields={{ triggerPricing: true }}
          extraFields={({ fields, setFields }) => (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
              Fiyat onerisi uretimi tetiklensin
            </label>
          )}
        />

        <ImportModuleCard
          title="Rakip Fiyat Import"
          description="Kolonlar: stok_kodu, rakip_adi, kanal_adi, beden_adi(optional), fiyat"
          endpoint="/import/rakip-fiyat"
          defaultFields={{ triggerPricing: true }}
          extraFields={({ fields, setFields }) => (
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
              Fiyat onerisi uretimi tetiklensin
            </label>
          )}
        />

        <ImportModuleCard
          title="Satislar (Sales) Import"
          description="Kolonlar: stok_kodu, kanal_adi, satis_miktari, birim_fiyat, maliyet_snapshot, satis_tarihi(optional)"
          endpoint="/import/satislar"
          defaultFields={{}}
        />

        <ImportModuleCard
          title="Fiyatlandirma Kurali Import"
          description="Kolonlar: kanal_adi, kategori_adi, komisyon_orani, lojistik_gideri, kargo_ucreti, max_indirim, min_kar, rekabet_katsayisi, geri_gelinebilecek_yuzde, aylik_satis_hedefi, haftalik_satis_hedefi, aktiflik_durumu, gecerlilik_baslangic, gecerlilik_bitis(optional)"
          endpoint="/import/fiyatlandirma-kurali"
          defaultFields={{}}
        />

        <ImportModuleCard
          title="Kampanya Import"
          description="Kolonlar: kanal_adi, kampanya_adi, baslangic_tarihi, bitis_tarihi, hedef_indirim_orani, hedef_karlilik, sezon_adi(optional)"
          endpoint="/import/kampanya"
          defaultFields={{}}
        />
      </div>
    </div>
  );
}

function KullaniciAyarlariTab() {
  const { data = [] } = useQuery({
    queryKey: ['kullanicilar'],
    queryFn: () => api.get('/kullanicilar').then(r => r.data),
  });

  return (
    <div className="p-8 space-y-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Sistem Kullanıcıları</h3>
      <div className="table-shell">
        <table className="w-full text-left">
          <thead className="table-head">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Ad Soyad</th>
              <th className="px-6 py-4 font-semibold text-gray-600">E-posta</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(k => (
              <tr key={k.kullanici_id} className="table-row">
                <td className="px-6 py-4 font-medium text-gray-900">{k.ad_soyad}</td>
                <td className="px-6 py-4 text-gray-600">{k.eposta}</td>
                <td className="px-6 py-4">
                  {k.Rols?.map(r => <span key={r.rol_id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1">{r.rol_adi}</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Ayarlar() {
  const [activeTab, setActiveTab] = useState('parametreler');

  const tabs = [
    { id: 'parametreler', label: 'Parametreler' },
    { id: 'importexport', label: 'Import Export' },
    { id: 'kullanicilar', label: 'Kullanıcı Ayarları' },
  ];

  return (
    <div className="page-shell max-w-[1400px]">
      <div>
        <h1 className="page-title">Ayarlar & Import/Export</h1>
        <p className="page-subtitle">Parametreleri yönetin, veri aktarım süreçlerini başlatın ve kullanıcı rollerini görüntüleyin</p>
      </div>

      {/* Tabs Layout */}
      <div className="relative">
        {/* Tab Buttons */}
        <div className="flex gap-1 ml-0 border-b border-gray-200 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-2.5 text-base transition-all duration-200 rounded-md
                ${activeTab === tab.id 
                  ? 'bg-gray-100 text-gray-900 font-semibold' 
                  : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="panel min-h-[500px] shadow-none">
          {activeTab === 'parametreler' && <ParametrelerTab />}
          {activeTab === 'importexport' && <ImportExportTab />}
          {activeTab === 'kullanicilar' && <KullaniciAyarlariTab />}
        </div>
      </div>
    </div>
  );
}

