import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, CalendarRange } from 'lucide-react';
import api from '../api';
import FilterSelect from '../components/FilterSelect';

export default function Kampanyalar() {
  const qc = useQueryClient();
  const [form, setForm]   = useState(null); // null = closed, {} = new
  const [loading, setLoading] = useState(false);

  const { data: kampanyalar = [], isLoading } = useQuery({
    queryKey: ['kampanyalar'],
    queryFn: () => api.get('/kampanyalar').then(r => r.data),
  });

  const { data: kanallar = [] } = useQuery({
    queryKey: ['kanallar'],
    queryFn: () => api.get('/kanallar').then(r => r.data),
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/kampanyalar', form);
      qc.invalidateQueries(['kampanyalar']);
      setForm(null);
    } finally { setLoading(false); }
  };

  return (
    <div className="page-shell max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Kampanya Planlama</h1>
          <p className="page-subtitle">Pazaryeri kampanya takvimi ve karlılık hedefleri</p>
        </div>
        <button onClick={() => setForm({ kampanya_adi: '', kanal_id: '', baslangic_tarihi: '', bitis_tarihi: '', hedef_indirim_orani: '', hedef_karlilik: '' })}
          className="btn-primary">
          <Plus size={15} /> Yeni Kampanya
        </button>
      </div>

      {/* New Campaign Form */}
      {form && (
        <div className="panel p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Yeni Kampanya Oluştur</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Kampanya Adı', key: 'kampanya_adi', type: 'text' },
              { label: 'Başlangıç Tarihi', key: 'baslangic_tarihi', type: 'date' },
              { label: 'Bitiş Tarihi', key: 'bitis_tarihi', type: 'date' },
              { label: 'Hedef İndirim (%)', key: 'hedef_indirim_orani', type: 'number', step: '0.01' },
              { label: 'Hedef Karlılık (%)', key: 'hedef_karlilik', type: 'number', step: '0.01' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type={f.type} step={f.step} value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="form-input" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kanal</label>
              <FilterSelect
                value={form.kanal_id}
                onChange={e => setForm(p => ({ ...p, kanal_id: e.target.value }))}
                selectClassName="h-10 border-2 text-sm"
                iconSize={16}
              >
                <option value="">Seçiniz</option>
                {kanallar.map(k => <option key={k.kanal_id} value={k.kanal_id}>{k.kanal_adi}</option>)}
              </FilterSelect>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setForm(null)} className="btn-secondary">İptal</button>
            <button onClick={handleSave} disabled={loading} className="btn-primary">
              {loading ? <Loader2 size={14} className="animate-spin" /> : null} Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Campaign Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kampanyalar.map((k) => (
            <div key={k.kampanya_id} className="panel p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight">{k.kampanya_adi}</h3>
                <span className="badge-slate shrink-0">{k.Kanal?.kanal_adi}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <CalendarRange size={13} />
                {k.baslangic_tarihi} → {k.bitis_tarihi}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Hedef İndirim</p>
                  <p className="text-sm font-bold text-brand-500">%{(parseFloat(k.hedef_indirim_orani) * 100).toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Hedef Karlılık</p>
                  <p className="text-sm font-bold text-emerald-600">%{(parseFloat(k.hedef_karlilik) * 100).toFixed(0)}</p>
                </div>
              </div>
            </div>
          ))}
          {kampanyalar.length === 0 && (
            <div className="col-span-3 text-center text-gray-500 py-12">
              Henüz kampanya oluşturulmamış
            </div>
          )}
        </div>
      )}
    </div>
  );
}

