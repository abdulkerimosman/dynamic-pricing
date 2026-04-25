import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Save, X, Plus, Trash2, Upload, Download } from 'lucide-react';
import api from '../api';

const TABLE_CONFIGS = [
  {
    key: 'marka',
    label: 'Markalar',
    idKey: 'marka_id',
    columns: [{ key: 'marka_adi', label: 'Marka Adi', type: 'text' }],
  },
  {
    key: 'kategoriler',
    label: 'Kategoriler',
    idKey: 'kategori_id',
    columns: [
      { key: 'kategori_adi', label: 'Kategori Adi', type: 'text' },
      { key: 'kar_beklentisi', label: 'Kar Beklentisi', type: 'number', step: '0.01' },
    ],
  },
  {
    key: 'sezonlar',
    label: 'Sezonlar',
    idKey: 'sezon_id',
    columns: [
      { key: 'sezon_adi', label: 'Sezon Adi', type: 'text' },
      { key: 'baslangic_tarihi', label: 'Baslangic', type: 'date' },
      { key: 'bitis_tarihi', label: 'Bitis', type: 'date' },
    ],
  },
  {
    key: 'beden',
    label: 'Bedenler',
    idKey: 'beden_id',
    columns: [{ key: 'beden_adi', label: 'Beden', type: 'text' }],
  },
  {
    key: 'cinsiyetler',
    label: 'Cinsiyetler',
    idKey: 'cinsiyet_id',
    columns: [{ key: 'cinsiyet_adi', label: 'Cinsiyet', type: 'text' }],
  },
  {
    key: 'urunler',
    label: 'Urunler',
    idKey: 'urun_id',
    columns: [
      { key: 'barkod', label: 'Barkod', type: 'text' },
      { key: 'stok_kodu', label: 'Stok Kodu', type: 'text' },
      { key: 'urun_adi', label: 'Urun Adi', type: 'text' },
      { key: 'kategori_id', label: 'Kategori', type: 'select', optionsKey: 'kategoriler', optionValue: 'kategori_id', optionLabel: 'kategori_adi' },
      { key: 'marka_id', label: 'Marka', type: 'select', optionsKey: 'markalar', optionValue: 'marka_id', optionLabel: 'marka_adi' },
      { key: 'maliyet', label: 'Maliyet', type: 'number', step: '0.01' },
      { key: 'resim_url', label: 'Resim URL', type: 'text' },
      { key: 'olusturma_tarihi', label: 'Olusturma Tarihi', type: 'datetime', editable: false, creatable: false },
      { key: 'guncelleme_tarihi', label: 'Guncelleme Tarihi', type: 'datetime', editable: false, creatable: false },
    ],
  },
  {
    key: 'urun_cinsiyet',
    label: 'Urun-Cinsiyet',
    idKey: 'urun_cinsiyet_id',
    columns: [
      { key: 'urun_id', label: 'Urun', type: 'select', optionsKey: 'urunler', optionValue: 'urun_id', optionLabel: 'urun_label' },
      { key: 'cinsiyet_id', label: 'Cinsiyet', type: 'select', optionsKey: 'cinsiyetler', optionValue: 'cinsiyet_id', optionLabel: 'cinsiyet_adi' },
    ],
  },
  {
    key: 'kanallar',
    label: 'Kanallar',
    idKey: 'kanal_id',
    columns: [
      { key: 'kanal_adi', label: 'Kanal Adi', type: 'text' },
      { key: 'kanal_url', label: 'Kanal URL', type: 'text' },
      { key: 'kanal_aciklamasi', label: 'Aciklama', type: 'text' },
      { key: 'kanal_sahibi', label: 'Web Kanali', type: 'boolean' },
      { key: 'olusturma_tarihi', label: 'Olusturma Tarihi', type: 'datetime', editable: false, creatable: false },
    ],
  },
  {
    key: 'kanal_urun',
    label: 'Kanal-Urun',
    idKey: 'kanal_urun_id',
    columns: [
      { key: 'kanal_id', label: 'Kanal', type: 'select', optionsKey: 'kanallar', optionValue: 'kanal_id', optionLabel: 'kanal_adi' },
      { key: 'urun_id', label: 'Urun', type: 'select', optionsKey: 'urunler', optionValue: 'urun_id', optionLabel: 'urun_label' },
      { key: 'web_liste_fiyati', label: 'Web Liste Fiyati', type: 'number', step: '0.01' },
      { key: 'web_indirim_fiyati', label: 'Web Indirim Fiyati', type: 'number', step: '0.01' },
      { key: 'pazaryeri_liste_fiyat', label: 'Pazaryeri Liste Fiyat', type: 'number', step: '0.01' },
      { key: 'pazaryeri_indirim_fiyat', label: 'Pazaryeri Indirim Fiyat', type: 'number', step: '0.01' },
    ],
  },
  {
    key: 'rakipler',
    label: 'Rakipler',
    idKey: 'rakip_id',
    columns: [
      { key: 'rakip_adi', label: 'Rakip Adi', type: 'text' },
      { key: 'rakip_url', label: 'Rakip URL', type: 'text' },
    ],
  },
  {
    key: 'kategori_sezon',
    label: 'Kategori-Sezon Eslesmeleri',
    idKey: 'kategori_sezon_id',
    columns: [
      { key: 'kategori_id', label: 'Kategori', type: 'select', optionsKey: 'kategoriler', optionValue: 'kategori_id', optionLabel: 'kategori_adi' },
      { key: 'sezon_id', label: 'Sezon', type: 'select', optionsKey: 'sezonlar', optionValue: 'sezon_id', optionLabel: 'sezon_adi' },
    ],
  },
  {
    key: 'fiyatlandirma_kurallari',
    label: 'Fiyatlandirma Kurallari',
    idKey: 'kural_id',
    columns: [
      { key: 'kanal_id', label: 'Kanal', type: 'select', optionsKey: 'kanallar', optionValue: 'kanal_id', optionLabel: 'kanal_adi' },
      { key: 'kategori_id', label: 'Kategori', type: 'select', optionsKey: 'kategoriler', optionValue: 'kategori_id', optionLabel: 'kategori_adi' },
      { key: 'max_indirim', label: 'Max Indirim', type: 'number', step: '0.01' },
      { key: 'min_kar', label: 'Min Kar', type: 'number', step: '0.01' },
      { key: 'rekabet_katsayisi', label: 'Rekabet Katsayisi', type: 'number', step: '0.01' },
      { key: 'geri_gelinebilecek_yuzde', label: 'Geri Gelinebilecek Yuzde', type: 'number', step: '0.01' },
      { key: 'aylik_satis_hedefi', label: 'Aylik Satis Hedefi', type: 'number', step: '0.01' },
      { key: 'haftalik_satis_hedefi', label: 'Haftalik Satis Hedefi', type: 'number', step: '0.01' },
      { key: 'aktiflik_durumu', label: 'Aktif', type: 'boolean' },
      { key: 'gecerlilik_baslangic', label: 'Gecerlilik Baslangic', type: 'datetime' },
      { key: 'gecerlilik_bitis', label: 'Gecerlilik Bitis', type: 'datetime' },
    ],
  },
];

function valueForInput(col, value) {
  if (value === null || value === undefined) return col.type === 'boolean' ? false : '';
  if (col.type === 'date') return String(value).slice(0, 10);
  if (col.type === 'datetime') return String(value).slice(0, 16);
  if (col.type === 'boolean') return Boolean(value);
  return value;
}

function displayValue(col, row, meta) {
  const rawValue = row[col.key];
  if (rawValue === null || rawValue === undefined || rawValue === '') return '-';

  if (col.type === 'boolean') return rawValue ? 'Evet' : 'Hayir';
  if (col.type === 'date') return String(rawValue).slice(0, 10);
  if (col.type === 'datetime') return String(rawValue).replace('T', ' ').slice(0, 19);

  if (col.type === 'select') {
    const options = meta?.[col.optionsKey] || [];
    const found = options.find((o) => String(o[col.optionValue]) === String(rawValue));
    return found ? found[col.optionLabel] : String(rawValue);
  }

  return String(rawValue);
}

function buildInitialDraft(config, row = {}) {
  return config.columns.filter((col) => col.editable !== false).reduce((acc, col) => {
    acc[col.key] = valueForInput(col, row[col.key]);
    return acc;
  }, {});
}

function InputField({ col, value, onChange, meta }) {
  if (col.editable === false) {
    return <span className="text-sm text-gray-500">Salt okunur</span>;
  }

  if (col.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {col.label}
      </label>
    );
  }

  if (col.type === 'select') {
    const options = meta?.[col.optionsKey] || [];
    return (
      <select className="form-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Seciniz</option>
        {options.map((opt) => (
          <option key={opt[col.optionValue]} value={opt[col.optionValue]}>
            {opt[col.optionLabel]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="form-input"
      type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : col.type === 'datetime' ? 'datetime-local' : 'text'}
      step={col.step || undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function ReferenceDataManager() {
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = useState(TABLE_CONFIGS[0].key);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [newDraft, setNewDraft] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const activeConfig = useMemo(
    () => TABLE_CONFIGS.find((t) => t.key === activeType) || TABLE_CONFIGS[0],
    [activeType]
  );

  const { data: metaData } = useQuery({
    queryKey: ['referans-meta'],
    queryFn: () => api.get('/referans/meta').then((r) => r.data),
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['referans-table', activeType],
    queryFn: () => api.get(`/referans/${activeType}`).then((r) => r.data),
  });

  const creatableColumns = useMemo(
    () => activeConfig.columns.filter((col) => col.creatable !== false && col.editable !== false),
    [activeConfig]
  );

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(`/referans/${activeType}`, payload),
    onSuccess: () => {
      setFeedback({ ok: true, text: 'Yeni kayit olusturuldu.' });
      setCreateOpen(false);
      setNewDraft({});
      queryClient.invalidateQueries({ queryKey: ['referans-table', activeType] });
      queryClient.invalidateQueries({ queryKey: ['referans-meta'] });
    },
    onError: (error) => {
      setFeedback({ ok: false, text: error?.response?.data?.error || error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/referans/${activeType}/${id}`, payload),
    onSuccess: () => {
      setFeedback({ ok: true, text: 'Kayit guncellendi.' });
      setEditingId(null);
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ['referans-table', activeType] });
      queryClient.invalidateQueries({ queryKey: ['referans-meta'] });
    },
    onError: (error) => {
      setFeedback({ ok: false, text: error?.response?.data?.error || error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/referans/${activeType}/${id}`),
    onSuccess: () => {
      setFeedback({ ok: true, text: 'Kayit silindi.' });
      setEditingId(null);
      setDraft({});
      queryClient.invalidateQueries({ queryKey: ['referans-table', activeType] });
      queryClient.invalidateQueries({ queryKey: ['referans-meta'] });
    },
    onError: (error) => {
      setFeedback({ ok: false, text: error?.response?.data?.error || error.message });
    },
  });

  const importMutation = useMutation({
    mutationFn: async ({ dryRun }) => {
      if (!importFile) throw new Error('Lutfen once bir Excel dosyasi seciniz.');
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('dryRun', String(dryRun));
      const response = await api.post(`/referans/${activeType}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (result, vars) => {
      const msg = vars.dryRun
        ? `Dry Run tamamlandi. Gecerli: ${result.validRows ?? 0}, Hatali: ${result.invalidRows ?? 0}`
        : `Import tamamlandi. Yeni: ${result.createdCount ?? 0}, Guncellenen: ${result.updatedCount ?? 0}`;
      setFeedback({ ok: true, text: msg });
      if (!vars.dryRun) {
        queryClient.invalidateQueries({ queryKey: ['referans-table', activeType] });
        queryClient.invalidateQueries({ queryKey: ['referans-meta'] });
      }
    },
    onError: (error) => {
      setFeedback({ ok: false, text: error?.response?.data?.error || error.message });
    },
  });

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(`/referans/template/${activeType}`, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeType}_import_template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setFeedback({ ok: false, text: error?.response?.data?.error || error.message });
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">Referans Veriler</h3>
        <p className="text-sm text-gray-600">
          Tier 1 tablolarini buradan goruntuleyebilir, duzenleyebilir ve yeni kayit ekleyebilirsiniz.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABLE_CONFIGS.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setActiveType(item.key);
              setEditingId(null);
              setDraft({});
              setCreateOpen(false);
              setImportFile(null);
              setFeedback(null);
            }}
            className={`px-3 py-2 rounded border text-sm ${activeType === item.key
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {feedback ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${feedback.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {feedback.text}
        </div>
      ) : null}

      <div className="panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Toplam kayit: <span className="font-semibold text-gray-900">{rows.length}</span>
            {isFetching ? <span className="ml-2 text-gray-500">(yenileniyor)</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-secondary" onClick={handleDownloadTemplate}>
              <Download size={16} /> Template
            </button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="form-input max-w-[260px]"
            />
            <button className="btn-secondary" disabled={!importFile || importMutation.isPending} onClick={() => importMutation.mutate({ dryRun: true })}>
              {importMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Dry Run
            </button>
            <button className="btn-primary" disabled={!importFile || importMutation.isPending} onClick={() => importMutation.mutate({ dryRun: false })}>
              {importMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              Import
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setCreateOpen((v) => !v);
                setNewDraft(buildInitialDraft({ ...activeConfig, columns: creatableColumns }));
              }}
            >
              <Plus size={16} /> Yeni Kayit
            </button>
          </div>
        </div>

        {createOpen ? (
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {creatableColumns.map((col) => (
                <div key={col.key} className="space-y-1">
                  {col.type !== 'boolean' ? <label className="text-xs font-medium text-gray-600">{col.label}</label> : null}
                  <InputField
                    col={col}
                    value={newDraft[col.key]}
                    meta={metaData}
                    onChange={(val) => setNewDraft((prev) => ({ ...prev, [col.key]: val }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(newDraft)}
              >
                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Kaydet
              </button>
              <button className="btn-secondary" onClick={() => setCreateOpen(false)}>
                <X size={16} /> Vazgec
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                {activeConfig.columns.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left whitespace-nowrap">{col.label}</th>
                ))}
                <th className="px-3 py-2 text-right">Islem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={activeConfig.columns.length + 2} className="px-4 py-8 text-center text-gray-500">
                    <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Yukleniyor...</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={activeConfig.columns.length + 2} className="px-4 py-8 text-center text-gray-500">
                    Kayit bulunamadi.
                  </td>
                </tr>
              ) : rows.map((row) => {
                const rowId = row[activeConfig.idKey];
                const isEditing = editingId === rowId;
                return (
                  <tr key={rowId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-600">{rowId}</td>
                    {activeConfig.columns.map((col) => (
                      <td key={col.key} className="px-3 py-2 align-top">
                        {isEditing && col.editable !== false ? (
                          <InputField
                            col={col}
                            value={draft[col.key]}
                            meta={metaData}
                            onChange={(val) => setDraft((prev) => ({ ...prev, [col.key]: val }))}
                          />
                        ) : (
                          <span className="text-gray-800">{displayValue(col, row, metaData)}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              className="btn-primary"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: rowId, payload: draft })}
                            >
                              {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                              Kaydet
                            </button>
                            <button className="btn-secondary" onClick={() => { setEditingId(null); setDraft({}); }}>
                              <X size={16} /> Iptal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setEditingId(rowId);
                                setDraft(buildInitialDraft(activeConfig, row));
                              }}
                            >
                              <Pencil size={16} /> Duzenle
                            </button>
                            <button
                              className="btn-secondary"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                const ok = window.confirm('Bu kaydi silmek istediginize emin misiniz?');
                                if (!ok) return;
                                deleteMutation.mutate(rowId);
                              }}
                            >
                              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              Sil
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
