import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function Rakipler() {
  const { data, isLoading } = useQuery({
    queryKey: ['rakip-fiyatlar'],
    queryFn: () => api.get('/rakipler/fiyatlar?limit=60').then(r => r.data),
  });

  const fiyatlar = data?.fiyatlar ?? [];

  return (
    <div className="space-y-5 max-w-screen-xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Rakip Fiyat Takibi</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rakip sitelerden toplanan fiyat verileri</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="th">Ürün</th>
                <th className="th">Rakip</th>
                <th className="th">Kanal</th>
                <th className="th">Beden</th>
                <th className="th">Rakip Fiyatı</th>
                <th className="th">Veri Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={6} className="td text-center py-10"><Loader2 size={20} className="animate-spin mx-auto text-slate-400" /></td></tr>
              )}
              {!isLoading && fiyatlar.map((f) => (
                <tr key={f.rakip_fiyat_id} className="tr-hover">
                  <td className="td font-medium max-w-[200px] truncate">{f.Urun?.urun_adi ?? '—'}</td>
                  <td className="td">
                    <a href={f.Rakip?.rakip_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                      {f.Rakip?.rakip_adi}
                    </a>
                  </td>
                  <td className="td text-slate-500">{f.Kanal?.kanal_adi ?? '—'}</td>
                  <td className="td"><span className="badge-slate">{f.Beden?.beden_adi ?? 'Genel'}</span></td>
                  <td className="td font-semibold">₺{parseFloat(f.fiyat).toLocaleString('tr-TR')}</td>
                  <td className="td text-slate-400 whitespace-nowrap">
                    {format(new Date(f.veri_kazima_zamani), 'd MMM yyyy HH:mm', { locale: tr })}
                  </td>
                </tr>
              ))}
              {!isLoading && fiyatlar.length === 0 && (
                <tr><td colSpan={6} className="td text-center text-slate-400 py-10">Rakip fiyat verisi bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
