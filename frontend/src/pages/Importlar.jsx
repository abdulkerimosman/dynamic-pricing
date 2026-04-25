import { useState } from 'react';
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react';
import api from '../api';

async function downloadTemplateFile(templateKey, fileName) {
  const response = await api.get(`/import/template/${templateKey}`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
    </div>
  );
}

function ImportModuleCard({
  title,
  description,
  columns = [],
  templateKey,
  templateFileName,
  endpoint,
  extraFields,
  defaultFields,
}) {
  const [file, setFile] = useState(null);
  const [loadingDryRun, setLoadingDryRun] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [result, setResult] = useState(null);
  const [fields, setFields] = useState(defaultFields || {});

  const handleDownloadTemplate = async () => {
    if (!templateKey || !templateFileName) return;

    setLoadingTemplate(true);
    try {
      await downloadTemplateFile(templateKey, templateFileName);
    } catch (error) {
      setResult({
        success: false,
        error: error?.response?.data?.error || error.message || 'Ornek Excel indirilemedi.',
      });
    } finally {
      setLoadingTemplate(false);
    }
  };

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
      <div className="space-y-1">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {columns.map((column) => (
          <span key={column} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
            {column}
          </span>
        ))}
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
        <button className="btn-secondary" onClick={handleDownloadTemplate} disabled={loadingTemplate || !templateKey || !templateFileName}>
          {loadingTemplate ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Ornek Excel Indir
        </button>
      </div>

      <ImportResultBox result={result} />
    </div>
  );
}

const FREQUENT_IMPORTS = [
  {
    title: 'Stok Import',
    description: 'Beden bazli stok miktari gunceller ve stok katsayisini fiyat motoruna besler.',
    columns: ['stok_kodu', 'beden_adi', 'stok_miktari', 'stok_katsayisi'],
    templateKey: 'stok',
    templateFileName: 'stok_ornek.xlsx',
    endpoint: '/import/stok',
    defaultFields: { triggerPricing: true },
    extraFields: ({ fields, setFields }) => (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
        Fiyat onerisi uretimi tetiklensin
      </label>
    ),
  },
  {
    title: 'Rakip Fiyat Import',
    description: 'Rakip fiyat snapshotlarini toplu olarak sisteme alir.',
    columns: ['stok_kodu', 'rakip_adi', 'kanal_adi', 'beden_adi', 'fiyat'],
    templateKey: 'rakip-fiyat',
    templateFileName: 'rakip_fiyat_ornek.xlsx',
    endpoint: '/import/rakip-fiyat',
    defaultFields: { triggerPricing: true },
    extraFields: ({ fields, setFields }) => (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
        Fiyat onerisi uretimi tetiklensin
      </label>
    ),
  },
  {
    title: 'Satislar Import',
    description: 'Gercek satis verisini sisteme alir; dashboard ve karlilik hesaplari buradan beslenir.',
    columns: ['stok_kodu', 'kanal_adi', 'satis_miktari', 'birim_fiyat', 'maliyet_snapshot', 'satis_tarihi'],
    templateKey: 'satislar',
    templateFileName: 'satislar_ornek.xlsx',
    endpoint: '/import/satislar',
    defaultFields: { triggerPricing: true },
    extraFields: ({ fields, setFields }) => (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(fields.triggerPricing)} onChange={(e) => setFields((p) => ({ ...p, triggerPricing: e.target.checked }))} />
        Fiyat onerisi uretimi tetiklensin
      </label>
    ),
  },
];

export default function Importlar() {
  return (
    <div className="page-shell max-w-[1400px] space-y-6">
      <div>
        <h1 className="page-title">Importlar</h1>
        <p className="page-subtitle">Sik guncellenen operasyonel verileri buradan yukleyin</p>
      </div>

      <div className="panel p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {FREQUENT_IMPORTS.map((item) => (
            <ImportModuleCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}