import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api';
import ProductThumb from '../components/ProductThumb';
import FilterSelect from '../components/FilterSelect';
import { exportRowsToExcelCsv } from '../utils/excelExport';

function StokDetayRow({ urun }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stok-zaman-serisi', urun.stokKodu],
    queryFn: () => api.get(`/stok/${encodeURIComponent(urun.stokKodu)}/zaman-serisi`).then(r => r.data)
  });

  return (
    <tr className="bg-white border-b border-gray-200">
      <td colSpan={13} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            <div className="bg-gray-100/60 px-4 py-2 border-b border-gray-200 inline-block rounded-br-lg text-xs font-semibold text-gray-500 mb-4">
              Section 1
            </div>

            <div className="flex flex-col md:flex-row p-6 gap-8 items-start">
              
              {/* Product Info Left */}
              <div className="flex flex-col items-center justify-center w-full md:w-1/3">
                <h3 className="text-lg text-gray-800 mb-8 self-start font-medium">Stok Kodu - {urun.stokKodu}</h3>
                <ProductThumb
                  src={urun.fotograf}
                  alt={urun.stokKodu}
                  wrapperClassName="w-64 h-64 flex items-center justify-center"
                  className="w-64 object-contain mix-blend-multiply drop-shadow-md"
                />
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSezon, setSelectedSezon] = useState('');
  const [selectedCinsiyet, setSelectedCinsiyet] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedStokPeriod, setSelectedStokPeriod] = useState('30');
  const [selectedStokDurum, setSelectedStokDurum] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['stok-analiz', selectedStokPeriod],
    queryFn: () => api.get('/stok/analiz', {
      params: { stok_period: selectedStokPeriod }
    }).then(r => r.data)
  });

  const kpis = data?.kpis || {};
  const urunler = data?.urunler || [];

  const sezonOptions = Array.from(new Set(urunler.map((u) => u.sezon).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const cinsiyetOptions = Array.from(new Set(urunler.map((u) => u.cinsiyet).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const kategoriOptions = Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));

  const filteredUrunler = urunler.filter(u => 
    (search === '' || 
      (u.stokKodu && u.stokKodu.toLowerCase().includes(search.toLowerCase())) ||
      (u.marka && u.marka.toLowerCase().includes(search.toLowerCase()))) &&
    (!selectedSezon || u.sezon === selectedSezon) &&
    (!selectedCinsiyet || u.cinsiyet === selectedCinsiyet) &&
    (!selectedKategori || u.kategori === selectedKategori) &&
    (
      selectedStokDurum === 'all' ||
      (selectedStokDurum === 'kritik' && u.oneri === 'Stok Tedariği') ||
      (selectedStokDurum === 'fazla' && u.oneri === 'İndirim Uygula')
    )
  );

  const handleExcelExport = () => {
    exportRowsToExcelCsv({
      rows: filteredUrunler,
      fileName: 'stok_analizi',
      columns: [
        { header: 'Stok Kodu', value: 'stokKodu' },
        { header: 'Marka', value: 'marka' },
        { header: 'Cinsiyet', value: 'cinsiyet' },
        { header: 'Sezon', value: 'sezon' },
        { header: 'Kategori', value: 'kategori' },
        { header: 'Toplam Stok', value: 'toplamStok' },
        { header: 'Satilan Adet', value: 'satilanAdet' },
        { header: 'Devir Hizi (Adet/Gun)', value: 'satisHiz' },
        { header: 'Tukenme Gunu', value: 'stokGun' },
        { header: 'Beden Kirikligi Orani', value: (row) => (row.bedenKiriklikOrani > 0 ? `${row.bedenKiriklikOrani}%` : '-') },
        { header: 'Oneri', value: 'oneri' },
        { header: 'Maliyet', value: 'maliyet' },
        { header: 'Son Satis Tarihi', value: (row) => (row.sonSatisTarihi ? new Date(row.sonSatisTarihi).toLocaleString('tr-TR') : '-') },
        { header: 'Guncelleme Saati', value: (row) => (row.guncellemeSaati ? new Date(row.guncellemeSaati).toLocaleString('tr-TR') : '-') },
      ],
    });
  };

  return (
    <div className="page-shell w-full max-w-none">
      
      {/* Header */}
      <div>
        <h1 className="page-title">Stok ve Talep Analizi</h1>
        <p className="page-subtitle">Stok riski, satış hızı ve beden kırıklığına göre operasyon önceliklerini yönetin</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="panel text-center md:text-left p-5">
          <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">Sıfır Stok Ürünler</div>
          <div className="text-4xl font-semibold text-gray-900 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.sifirStokSayisi}
          </div>
        </div>
        
        <div className="panel text-center md:text-left p-5">
          <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">Kritik Stok (≤ 30 gün)</div>
          <div className="text-4xl font-semibold text-gray-900 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.kritikStokSayisi}
          </div>
        </div>
        
        <div className="panel text-center md:text-left p-5">
          <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">Stok Fazlası (≥ 90 gün)</div>
          <div className="text-4xl font-semibold text-gray-900 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.stokFazlasiSayisi}
          </div>
        </div>
        
        <div className="panel text-center md:text-left p-5">
          <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">Yüksek Beden Kırıklığı</div>
          <div className="text-4xl font-semibold text-gray-900 mb-1">
            {isLoading ? <Loader2 className="animate-spin inline" /> : kpis.yuksekBedenKriklikSayisi}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start items-center justify-end gap-4 mt-6">
        <div className="flex flex-wrap items-center gap-2 sm:mr-auto">
          <span className="text-sm text-gray-600 font-medium">Devir Hızı Periyodu:</span>
          {[
            { value: '7', label: '1 Hafta' },
            { value: '30', label: '1 Ay' },
            { value: '90', label: '3 Ay' },
            { value: '365', label: '1 Yıl' },
          ].map((p) => (
            <button
              key={p.value}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${selectedStokPeriod === p.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              onClick={() => setSelectedStokPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:mr-auto sm:ml-4">
          <span className="text-sm text-gray-600 font-medium">Stok Durumu:</span>
          {[
            { value: 'all', label: 'Hepsi' },
            { value: 'kritik', label: 'Kritik Stok' },
            { value: 'fazla', label: 'Stok Fazlası' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-medium border ${selectedStokDurum === item.value ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              onClick={() => setSelectedStokDurum(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button className="btn-secondary" onClick={handleExcelExport} disabled={filteredUrunler.length === 0}>
          <FileSpreadsheet size={16} />
          Excel'e Aktar
        </button>
        
        <div className="relative w-64 md:w-80">
          <input 
            type="text" 
            placeholder="Stok kodu ara" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pr-10"
          />
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary">
          <Filter size={18} />
          Filter
        </button>
      </div>

      {showFilters && (
        <div className="panel p-4 grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <FilterSelect
            label="Sezon"
            value={selectedSezon}
            onChange={(e) => setSelectedSezon(e.target.value)}
            selectClassName="h-11 border-2 text-sm"
            iconSize={16}
          >
            <option value="">Tumu</option>
            {sezonOptions.map((sezon) => <option key={sezon} value={sezon}>{sezon}</option>)}
          </FilterSelect>

          <FilterSelect
            label="Cinsiyet"
            value={selectedCinsiyet}
            onChange={(e) => setSelectedCinsiyet(e.target.value)}
            selectClassName="h-11 border-2 text-sm"
            iconSize={16}
          >
            <option value="">Tumu</option>
            {cinsiyetOptions.map((cinsiyet) => <option key={cinsiyet} value={cinsiyet}>{cinsiyet}</option>)}
          </FilterSelect>

          <FilterSelect
            label="Kategori"
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            selectClassName="h-11 border-2 text-sm"
            iconSize={16}
          >
            <option value="">Tumu</option>
            {kategoriOptions.map((kategori) => <option key={kategori} value={kategori}>{kategori}</option>)}
          </FilterSelect>

          <div className="flex items-end">
            <button
              className="btn-secondary w-full justify-center"
              onClick={() => {
                setSelectedSezon('');
                setSelectedCinsiyet('');
                setSelectedKategori('');
              }}
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-shell text-sm">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-left border-collapse">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[9%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
            </colgroup>
            <thead className="table-head">
              <tr>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Stok Kodu</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Marka</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Kategori</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Toplam Stok</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Satılan Adet</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Devir Hızı</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Tükenme Günü</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Beden Kırıklığı Or.</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Öneri</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Maliyet</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Son Satış Tarihi</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Güncelleme Saati</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 text-center break-words">Fotoğraf</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold text-center break-words">Detay</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="text-center py-16">
                    <Loader2 size={32} className="animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredUrunler.length > 0 ? (
                filteredUrunler.map((u, i) => (
                  <Fragment key={u.stokKodu || i}>
                    <tr className={`table-row ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 font-medium break-all">{u.stokKodu}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.marka || '-'}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.kategori || '-'}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.toplamStok}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.satilanAdet || 0}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.satisHiz}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.stokGun}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.bedenKiriklikOrani > 0 ? `%${u.bedenKiriklikOrani}` : '-'}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">
                        {u.oneri !== '-' ? <span className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200">{u.oneri}</span> : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.maliyet > 0 ? Math.round(u.maliyet) : '-'}</td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 text-gray-500 break-words">
                        {u.sonSatisTarihi ? new Date(u.sonSatisTarihi).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 text-gray-500 break-words">
                        {u.guncellemeSaati ? new Date(u.guncellemeSaati).toLocaleString('tr-TR') : '-'}
                      </td>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200">
                        <ProductThumb
                          src={u.fotograf}
                          alt={u.stokKodu || 'Urun'}
                          wrapperClassName="w-10 h-10 mx-auto flex items-center justify-center"
                          className="max-w-full max-h-full object-contain mix-blend-multiply"
                        />
                      </td>
                      <td className="px-2 py-2 text-xs align-top text-center">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                          className="text-gray-600 hover:text-black focus:outline-none transition-transform hover:scale-110"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedRow === u.stokKodu && <StokDetayRow urun={u} />}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-gray-400">Aranan kriterlere uygun ürün bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

