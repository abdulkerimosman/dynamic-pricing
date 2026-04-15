import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2 } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ALERT_TIPI_LABEL = {
  rakip_fiyat_dustu: 'Rakip Fiyat Düşüşü',
  stok_yuksek:       'Stok Fazlası',
  stok_kritik:       'Kritik Stok',
  hedef_sapma:       'Hedef Sapması',
  beden_kirikligi:   'Beden Kırıklığı',
  karlilik_ihlali:   'Karlılık İhlali',
};

export default function Alertler() {
  const qc = useQueryClient();
  const [durum, setDurum] = useState('acik');

  const { data, isLoading } = useQuery({
    queryKey: ['alertler', durum],
    queryFn: () => api.get(`/alertler?durum=${durum}&limit=50`).then(r => r.data),
  });

  const cozMutation = useMutation({
    mutationFn: (id) => api.patch(`/alertler/${id}/coz`),
    onSuccess: () => { qc.invalidateQueries(['alertler']); qc.invalidateQueries(['dashboard']); },
  });

  const alertler = data?.alertler ?? [];

  return (
    <div className="page-shell max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Alertler</h1>
          <p className="page-subtitle">Sistem uyarıları ve aksiyon gerektiren durumlar</p>
        </div>
        <div className="flex gap-2">
          {['acik', 'cozuldu'].map((d) => (
            <button
              key={d}
              onClick={() => setDurum(d)}
              className={durum === d
                ? 'btn-primary'
                : 'btn-secondary'}
            >
              {d === 'acik' ? `Açık (${d === durum ? (data?.toplam ?? '…') : ''})` : 'Çözüldü'}
            </button>
          ))}
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="th">Ürün</th>
                <th className="th">Kanal</th>
                <th className="th">Alert Tipi</th>
                <th className="th">Mesaj</th>
                <th className="th">Tarih</th>
                <th className="th">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="td text-center py-10"><Loader2 size={20} className="animate-spin mx-auto text-gray-400" /></td></tr>
              )}
              {!isLoading && alertler.map((a) => (
                <tr key={a.alert_id} className="table-row">
                  <td className="td font-medium">{a.KanalUrun?.Urun?.urun_adi ?? '—'}</td>
                  <td className="td text-gray-600">{a.KanalUrun?.Kanal?.kanal_adi ?? '—'}</td>
                  <td className="td">
                    <span className={a.durum === 'acik' ? 'badge-red' : 'badge-green'}>
                      {ALERT_TIPI_LABEL[a.alert_tipi] ?? a.alert_tipi}
                    </span>
                  </td>
                  <td className="td text-gray-600 max-w-xs">{a.mesaj}</td>
                  <td className="td text-gray-500 whitespace-nowrap">
                    {format(new Date(a.olusturma_tarihi), 'd MMM yyyy', { locale: tr })}
                  </td>
                  <td className="td">
                    {a.durum === 'acik' && (
                      <button
                        onClick={() => cozMutation.mutate(a.alert_id)}
                        disabled={cozMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                      >
                        <CheckCircle size={13} /> Çözüldü
                      </button>
                    )}
                    {a.durum === 'cozuldu' && (
                      <span className="text-xs text-gray-500">
                        {a.cozulme_tarihi ? format(new Date(a.cozulme_tarihi), 'd MMM', { locale: tr }) : '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && alertler.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-gray-500 py-10">
                  {durum === 'acik' ? '✅ Açık alert bulunmuyor' : 'Çözülmüş alert yok'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

