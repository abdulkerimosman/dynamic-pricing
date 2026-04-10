import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet, ExternalLink, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../api';

function StatCard({ value, title }) {
  return (
    <div className="border border-gray-300 p-6 bg-white min-w-[200px] flex-1">
      <div className="text-3xl font-bold text-gray-800 mb-2">{value}</div>
      <div className="text-gray-600 text-sm">{title}</div>
    </div>
  );
}

function UrunDetayRow({ urun }) {
  const queryClient = useQueryClient();
  const [approved, setApproved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['urun-detay', urun.stokKodu],
    queryFn: () => api.get(`/urun-analizi/${urun.stokKodu}/detay`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={15} className="py-10 bg-gray-50 border-b border-gray-200">
          <Loader2 className="animate-spin text-gray-400 mx-auto" size={24} />
        </td>
      </tr>
    );
  }

  if (!data) {
    return (
      <tr>
        <td colSpan={15} className="py-10 bg-red-50 text-center text-red-500 border-b border-red-200">
          Detay verisi yüklenemedi. (Sunucu hatası veya veri eksik)
        </td>
      </tr>
    );
  }

  const { fiyatGecmisi = [], algoritmaDetayi = {}, rakipler = [] } = data;
  const alg = algoritmaDetayi || {};

  return (
    <tr className="bg-gray-50 border-b border-gray-300">
      <td colSpan={15} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300">
          
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column: Image & Algorithmic Details */}
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">
                Stok Kodu - {urun.stokKodu}
              </h2>
              
              <div className="w-full max-w-[300px] aspect-video flex items-center justify-center">
                {urun.fotograf ? (
                  <img src={urun.fotograf} alt={urun.stokKodu} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">Ürün Görseli</div>
                )}
              </div>
              
              <div className="bg-red-200/50 text-red-900 px-6 py-3 rounded text-2xl font-medium inline-block shadow-sm">
                Önerilen Fiyat - {alg.onerilenFiyat}
              </div>

              <div className="space-y-4 text-sm text-gray-700 bg-white p-6 rounded border border-gray-200">
                <p className="font-semibold text-gray-900 border-b pb-2">Öneri Nedeni (Algoritma Detayları):</p>
                <div className="space-y-3 font-mono text-xs">
                  <p>Rakip Ortalama Fiyat = (Rakip₁ + Rakip₂ ... ) / n</p>
                  <p>Rakip Ortalama Fiyat = ({alg.rakipFiyatlarArray?.join(' + ')}) / {alg.rakipFiyatlarArray?.length || 1}</p>
                  <p className="opacity-80 italic">*Beden kırıklığı %70'ten az olan rakipler hesaba katılmamıştır.</p>
                  <br />
                  <p>Önerilen Fiyat = max(Maliyet × (1 + Hedef Karlılık), Rakip Fiyat Ortalaması × Rekabet Katsayısı)</p>
                  <p>Önerilen Fiyat = max({alg.maliyet} × (1 + {alg.hedefKarlilik}), {alg.rakipFiyatOrtalamasi} × {alg.rekabetKatsayisi})</p>
                  <p>Önerilen Fiyat = {alg.onerilenFiyat}</p>
                  <br />
                  <p>Nihai Fiyat = Önerilen Fiyat × Talep Katsayısı × Stok Katsayısı</p>
                  <p>Nihai Fiyat = {alg.onerilenFiyat} × {alg.talepKatsayisi} × {alg.stokKatsayisi}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-6 p-4 bg-gray-50 rounded border border-gray-100 justify-center">
                  <div className="w-24 h-24 bg-red-100/50 flex items-center justify-center rounded border border-red-200 flex-col">
                    <span className="text-xl font-semibold text-red-700">%{(alg.eskiKarlilik || 0).toFixed(0)}</span>
                    <span className="text-[10px] text-red-600 mt-1 uppercase">Eski Kârlılık</span>
                  </div>
                  <div className="text-gray-400 font-bold px-2">{"Yeni Karlılık"}</div>
                  <div className="w-24 h-24 bg-red-100 flex items-center justify-center rounded border border-red-200 flex-col">
                    <span className="text-xl font-semibold text-red-800">%{(alg.yeniKarlilik || 0).toFixed(0)}</span>
                    <span className="text-[10px] text-red-700 mt-1 uppercase">Yeni Kârlılık</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Chart & Action */}
            <div className="flex-[1.5] space-y-8 flex flex-col">
              
              {/* Chart */}
              <div className="bg-white p-6 rounded border border-gray-200 w-full h-[400px]">
                <h3 className="text-center font-semibold text-gray-800 mb-6 font-sans">Fiyat Değişim Geçmişi</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fiyatGecmisi} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#9CA3AF" tick={{fontSize: 10}} tickMargin={10} />
                    <YAxis stroke="#9CA3AF" tick={{fontSize: 10}} domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="fiyat" stroke="#8B5CF6" strokeWidth={2} dot={{r: 3, fill: '#8B5CF6'}} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Rakipler Beden Tablosu */}
              <div className="bg-white border text-sm border-gray-200 rounded overflow-hidden">
                <table className="w-full whitespace-nowrap text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs">
                    <tr>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Satıcı</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Fiyat</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Aktif Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Pasif Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Beden Oranı</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Favori Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-100">Güncelleme</th>
                      <th className="px-4 py-2 font-medium text-center">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rakipler?.map((r, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-4 py-2 border-r border-gray-100">{r.satici}</td>
                        <td className="px-4 py-2 border-r border-gray-100">{r.fiyat}</td>
                        <td className="px-4 py-2 border-r border-gray-100">{r.aktifBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-100">{r.pasifBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-100 w-32">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
                            <div className={`h-full ${r.bedenOrani >= 70 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${r.bedenOrani}%` }}></div>
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-100">{r.favoriBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-100 text-[10px] text-gray-500">{r.guncelleme}</td>
                        <td className="px-4 py-2 text-center">
                          <a href={r.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 inline-block">
                            <ExternalLink size={16} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-4">
                {approved ? (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle size={20} />
                    Fiyat onaylandı ve güncellendi!
                  </div>
                ) : (
                  <button
                    disabled={!data?.oneriId}
                    onClick={async () => {
                      if (!data?.oneriId) return;
                      try {
                        await api.patch(`/fiyat-onerileri/${data.oneriId}/onayla`);
                        setApproved(true);
                        queryClient.invalidateQueries(['urun-analizi']);
                        queryClient.invalidateQueries(['urun-detay', urun.stokKodu]);
                      } catch (e) {
                        alert('Onaylama başarısız: ' + (e?.response?.data?.error || e.message));
                      }
                    }}
                    className="bg-[#FF6B59] hover:bg-[#ff5540] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-10 py-3 rounded shadow-sm font-medium transition-colors"
                  >
                    Onayla
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

export default function UrunFiyatAnalizi() {
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['urun-analizi'],
    queryFn: () => api.get('/urun-analizi').then(r => r.data)
  });

  const kpis = data?.kpis || {};
  const urunler = data?.urunler || [];

  const filteredUrunler = search ? urunler.filter(u => 
    u.stokKodu.toLowerCase().includes(search.toLowerCase()) || 
    (u.marka && u.marka.toLowerCase().includes(search.toLowerCase()))
  ) : urunler;

  return (
    <div className="space-y-8 max-w-[1400px]">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Ürün Fiyat Analizi</h1>
      </div>

      {/* KPI Row */}
      <div className="flex gap-6 overflow-x-auto pb-2">
        <StatCard value={kpis.toplam_urun || 0} title="Toplam Ürün" />
        <StatCard value={kpis.fiyat_avantajli_urun || 0} title="Fiyat Avantajlı Ürün" />
        <StatCard value={kpis.fiyat_dezavantajli_urun || 0} title="Fiyat Dezavantajlı Ürün" />
        <StatCard value={kpis.kritik_farki_olan_urunler || 0} title="Kritik Farkı Olan Ürünler" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 mt-4">
        <button className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors">
          <FileSpreadsheet size={16} />
          Excel'e Aktar
        </button>
        
        <div className="relative w-64">
          <input 
            type="text" 
            placeholder="Stok kodu ara" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-full px-4 py-1.5 text-sm outline-none focus:border-gray-400"
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-transparent font-medium">
          <Filter size={16} />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-300 bg-white overflow-hidden text-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-300 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Stok Kodu</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Maliyet</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Liste Fiyat</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">İndirimli Fiyat</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Rakip Fiyat Ortalaması</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Kâr Oranı</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Önerilen Fiyat</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Güncelleme Saati</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200 text-center">Detay</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Fotoğraf</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Marka</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Toplam Stok</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">En Ucuz Satıcı</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Kategori</th>
                <th className="px-4 py-3 font-semibold border-r border-gray-200">Karlılık İhlali</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="text-center py-10">
                    <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredUrunler.length > 0 ? (
                filteredUrunler.map((u, i) => (
                  <Fragment key={u.stokKodu || i}>
                    <tr className={`border-b border-gray-200 hover:bg-gray-50 text-gray-700 ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-3 border-r border-gray-200">{u.stokKodu}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.maliyet > 0 ? u.maliyet : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.listeFiyat > 0 ? u.listeFiyat : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.indirimliFiyat > 0 ? u.indirimliFiyat : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.rakipFiyatOrtalamasi > 0 ? Math.round(u.rakipFiyatOrtalamasi) : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.karOrani > 0 ? `%${Math.round(u.karOrani)}` : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.onerilenFiyat > 0 ? u.onerilenFiyat : '-'}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.guncellemeSaati}</td>
                    <td className="px-4 py-3 border-r border-gray-200 text-center">
                      <button 
                        onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                        className="text-gray-500 hover:text-black focus:outline-none"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200">
                      {u.fotograf ? (
                        <div className="w-8 h-8 mx-auto flex items-center justify-center">
                          <img src={u.fotograf} alt="" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 mx-auto flex items-center justify-center text-[10px] text-gray-400">İmage</div>
                      )}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.marka}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.toplamStok}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.enUcuzSatici}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.kategori}</td>
                    <td className="px-4 py-3 border-r border-gray-200">{u.karlilikIhlali}</td>
                  </tr>
                  {expandedRow === u.stokKodu && <UrunDetayRow urun={u} />}
                </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={15} className="text-center py-6 text-gray-400">Veri bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
