import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';

function StokDetayRow({ urun }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stok-zaman-serisi', urun.stokKodu],
    queryFn: () => api.get(`/stok/${urun.stokKodu}/zaman-serisi`).then(r => r.data)
  });

  return (
    <tr className="bg-gray-50 border-b border-gray-300">
      <td colSpan={12} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            <div className="bg-gray-100/60 px-4 py-2 border-b border-gray-200 inline-block rounded-br-lg text-xs font-semibold text-gray-500 mb-4">
              Section 1
            </div>

            <div className="flex flex-col md:flex-row p-6 gap-8 items-start">
              
              {/* Product Info Left */}
              <div className="flex flex-col items-center justify-center w-full md:w-1/3">
                <h3 className="text-lg text-gray-800 mb-8 self-start font-medium">Stok Kodu - {urun.stokKodu}</h3>
                {urun.fotograf ? (
                  <img src={urun.fotograf} className="w-64 object-contain mix-blend-multiply drop-shadow-md" alt={urun.stokKodu} />
                ) : (
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Görsel Yok</div>
                )}
              </div>

              {/* Time Series Graph Right */}
              <div className="w-full md:w-2/3 h-[400px]">
                <h4 className="text-xl font-medium text-gray-800 mb-6 text-center">Ürün Stok Zaman Serisi Analizi</h4>
                
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#9CA3AF'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#9CA3AF'}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                      />
                      
                      {/* Confidence Band (Range Area) */}
                      <Area 
                        type="monotone" 
                        dataKey="range" 
                        fill="#bae6fd" 
                        stroke="none" 
                        fillOpacity={0.6} 
                      />

                      {/* Actual Historical Line */}
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#0ea5e9" 
                        strokeWidth={2} 
                        dot={false} 
                        activeDot={{ r: 6 }}
                      />

                      {/* Forecast Future Line (Dashed) */}
                      <Line 
                        type="monotone" 
                        dataKey="forecast" 
                        stroke="#0ea5e9" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={false} 
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function Stok() {
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['stok-analiz'],
    queryFn: () => api.get('/stok/analiz').then(r => r.data)
  });

  const kpis = data?.kpis || {};
  const urunler = data?.urunler || [];

  const filteredUrunler = urunler.filter(u => 
    search === '' || 
    (u.stokKodu && u.stokKodu.toLowerCase().includes(search.toLowerCase())) ||
    (u.marka && u.marka.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-[1600px]">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Stok ve Talep Analizi</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border text-center md:text-left border-gray-200 p-6 rounded shadow-sm">
          <div className="text-4xl font-light text-gray-800 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.sifirStokSayisi}
          </div>
          <div className="text-sm text-gray-500 font-medium">Sıfır Stok Ürünler</div>
        </div>
        
        <div className="bg-white border text-center md:text-left border-gray-200 p-6 rounded shadow-sm">
          <div className="text-4xl font-light text-gray-800 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.kritikStokSayisi}
          </div>
          <div className="text-sm text-gray-500 font-medium">Kritik Stok (&lt; 15 gün)</div>
        </div>
        
        <div className="bg-white border text-center md:text-left border-gray-200 p-6 rounded shadow-sm">
          <div className="text-4xl font-light text-gray-800 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.stokFazlasiSayisi}
          </div>
          <div className="text-sm text-gray-500 font-medium">Stok Fazlası (&gt; 60 gün)</div>
        </div>
        
        <div className="bg-white border text-center md:text-left border-gray-200 p-6 rounded shadow-sm">
          <div className="text-4xl font-light text-gray-800 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.yuksekBedenKriklikSayisi}
          </div>
          <div className="text-sm text-gray-500 font-medium">Yüksek Beden Kırıklığı Stok</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6">
        <button className="flex items-center gap-2 text-white px-2 py-1 rounded transition-colors bg-white">
          <FileSpreadsheet size={36} className="text-green-700 hover:text-green-800" />
        </button>
        
        <div className="relative w-64 md:w-80">
          <input 
            type="text" 
            placeholder="Stok kodu ara" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded px-4 py-2 text-sm outline-none focus:border-gray-500"
          />
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded border border-transparent font-medium border-gray-300">
          <Filter size={18} />
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden text-sm">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead className="bg-[#fafafa] border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Stok Kodu</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Maliyet</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Toplam Stok</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Stok Gün</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Satış Hız</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Beden Kırıklığı Or.</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Öneri</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Güncelleme Saati</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100 text-center">Detay</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100 text-center">Fotoğraf</th>
                <th className="px-4 py-4 font-semibold border-r border-gray-100">Marka</th>
                <th className="px-4 py-4 font-semibold">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16">
                    <Loader2 size={32} className="animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredUrunler.length > 0 ? (
                filteredUrunler.map((u, i) => (
                  <Fragment key={u.stokKodu || i}>
                    <tr className={`border-b border-gray-100 hover:bg-gray-50 text-gray-700 transition-colors ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-4 py-4 border-r border-gray-100 font-medium">{u.stokKodu}</td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.maliyet > 0 ? Math.round(u.maliyet) : '-'}</td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.toplamStok}</td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.stokGun}</td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.satisHiz}</td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.bedenKiriklikOrani > 0 ? `%${u.bedenKiriklikOrani}` : '-'}</td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        {u.oneri !== '-' ? <span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">{u.oneri}</span> : '-'}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 text-xs text-gray-500">
                        {u.guncellemeSaati ? new Date(u.guncellemeSaati).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100 text-center">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                          className="text-gray-600 hover:text-black focus:outline-none transition-transform hover:scale-110"
                        >
                          <Eye size={20} />
                        </button>
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100">
                        {u.fotograf ? (
                          <div className="w-10 h-10 mx-auto flex items-center justify-center">
                            <img src={u.fotograf} alt="" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded mx-auto flex items-center justify-center text-[10px] text-gray-400">Yok</div>
                        )}
                      </td>
                      <td className="px-4 py-4 border-r border-gray-100">{u.marka || '-'}</td>
                      <td className="px-4 py-4">{u.kategori || '-'}</td>
                    </tr>
                    {expandedRow === u.stokKodu && <StokDetayRow urun={u} />}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-gray-400">Aranan kriterlere uygun ürün bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
