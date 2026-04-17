import { useState, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet, ExternalLink, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../api';
import ProductThumb from '../components/ProductThumb';
import FilterSelect from '../components/FilterSelect';
import { exportRowsToExcelCsv } from '../utils/excelExport';

function StatCard({ value, title }) {
  return (
    <div className="panel p-5 min-w-[220px] flex-1">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">{title}</div>
      <div className="text-3xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function UrunDetayRow({ urun }) {
  const queryClient = useQueryClient();
  const [approved, setApproved] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['urun-detay', urun.stokKodu],
    queryFn: () => api.get(`/urun-analizi/${encodeURIComponent(urun.stokKodu)}/detay`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={15} className="py-10 bg-white border-b border-gray-200">
          <Loader2 className="animate-spin text-gray-400 mx-auto" size={24} />
        </td>
      </tr>
    );
  }

  if (isError || !data) {
    const errorMessage = error?.response?.data?.error || error?.message || 'Sunucu hatası veya veri eksik';
    return (
      <tr>
        <td colSpan={15} className="py-10 bg-red-50 text-center text-red-500 border-b border-red-200">
          Detay verisi yüklenemedi. ({errorMessage})
        </td>
      </tr>
    );
  }

  const { fiyatGecmisi = [], algoritmaDetayi = {}, rakipler = [] } = data;
  const alg = algoritmaDetayi || {};
  const hasPendingSuggestion = Boolean(data?.oneriId);
  const approvalUnavailableReason = hasPendingSuggestion
    ? ''
    : 'Bu ürün için beklemede fiyat önerisi bulunamadı. Önce ürün için öneri oluşturulmalı.';

  return (
    <tr className="bg-white border-b border-gray-200">
      <td colSpan={15} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300">
          
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column: Image & Algorithmic Details */}
            <div className="flex-1 space-y-6">
              <h2 className="text-xl font-bold text-gray-800 tracking-wide">
                Stok Kodu - {urun.stokKodu}
              </h2>
              
              <ProductThumb
                src={urun.fotograf}
                alt={urun.stokKodu}
                wrapperClassName="w-full max-w-[300px] aspect-video flex items-center justify-center"
                className="max-w-full max-h-full object-contain"
              />
              
              <div className="bg-red-50 text-red-700 px-6 py-3 rounded text-2xl font-semibold inline-block border border-red-200">
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
                
                <div className="flex items-center gap-4 mt-6 p-4 bg-white rounded border border-gray-200 justify-center">
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
                    <Line type="monotone" dataKey="fiyat" stroke="#EF3B36" strokeWidth={2.5} dot={{r: 3, fill: '#EF3B36'}} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Rakipler Beden Tablosu */}
              <div className="bg-white border text-sm border-gray-200 rounded overflow-hidden">
                <table className="w-full whitespace-nowrap text-left border-collapse">
                  <thead className="bg-white border-b border-gray-200 text-gray-700 text-xs">
                    <tr>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Satıcı</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Fiyat</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Aktif Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Pasif Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Beden Oranı</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Favori Beden</th>
                      <th className="px-4 py-2 font-medium border-r border-gray-200">Güncelleme</th>
                      <th className="px-4 py-2 font-medium text-center">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rakipler?.map((r, idx) => (
                      <tr key={idx} className="border-b border-gray-200 last:border-0 hover:bg-white">
                        <td className="px-4 py-2 border-r border-gray-200">{r.satici}</td>
                        <td className="px-4 py-2 border-r border-gray-200">{r.fiyat}</td>
                        <td className="px-4 py-2 border-r border-gray-200">{r.aktifBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-200">{r.pasifBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-200 w-32">
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden flex">
                            <div className={`h-full ${r.bedenOrani >= 70 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${r.bedenOrani}%` }}></div>
                          </div>
                        </td>
                        <td className="px-4 py-2 border-r border-gray-200">{r.favoriBeden}</td>
                        <td className="px-4 py-2 border-r border-gray-200 text-[10px] text-gray-500">{r.guncelleme}</td>
                        <td className="px-4 py-2 text-center">
                          <a href={r.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-500 inline-block">
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
                  <div className="flex flex-col items-end gap-2">
                    <button
                      disabled={!hasPendingSuggestion}
                      title={approvalUnavailableReason || 'Önerilen fiyatı onayla'}
                      onClick={async () => {
                        if (!hasPendingSuggestion) return;
                        try {
                          await api.patch(`/fiyat-onerileri/${data.oneriId}/onayla`);
                          setApproved(true);
                          queryClient.invalidateQueries(['urun-analizi']);
                          queryClient.invalidateQueries(['urun-detay', urun.stokKodu]);
                        } catch (e) {
                          alert('Onaylama başarısız: ' + (e?.response?.data?.error || e.message));
                        }
                      }}
                      className="btn-primary disabled:bg-gray-300 disabled:cursor-not-allowed px-10 py-3"
                    >
                      {hasPendingSuggestion ? 'Onayla' : 'Onay Bekliyor'}
                    </button>
                    {!hasPendingSuggestion && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 max-w-md text-right">
                        {approvalUnavailableReason}
                      </p>
                    )}
                  </div>
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSezon, setSelectedSezon] = useState('');
  const [selectedCinsiyet, setSelectedCinsiyet] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['urun-analizi'],
    queryFn: () => api.get('/urun-analizi').then(r => r.data)
  });

  const kpis = data?.kpis || {};
  const urunler = data?.urunler || [];

  const sezonOptions = Array.from(new Set(urunler.map((u) => u.sezon).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const cinsiyetOptions = Array.from(new Set(urunler.map((u) => u.cinsiyet).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const kategoriOptions = Array.from(new Set(urunler.map((u) => u.kategori).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));

  const filteredUrunler = urunler.filter((u) => {
    const searchMatch = !search ||
      (u.stokKodu && u.stokKodu.toLowerCase().includes(search.toLowerCase())) ||
      (u.marka && u.marka.toLowerCase().includes(search.toLowerCase()));
    const sezonMatch = !selectedSezon || u.sezon === selectedSezon;
    const cinsiyetMatch = !selectedCinsiyet || u.cinsiyet === selectedCinsiyet;
    const kategoriMatch = !selectedKategori || u.kategori === selectedKategori;
    return searchMatch && sezonMatch && cinsiyetMatch && kategoriMatch;
  });

  const handleExcelExport = () => {
    exportRowsToExcelCsv({
      rows: filteredUrunler,
      fileName: 'urun_fiyat_analizi',
      columns: [
        { header: 'Stok Kodu', value: 'stokKodu' },
        { header: 'Marka', value: 'marka' },
        { header: 'Cinsiyet', value: 'cinsiyet' },
        { header: 'Sezon', value: 'sezon' },
        { header: 'Kategori', value: 'kategori' },
        { header: 'Toplam Stok', value: 'toplamStok' },
        { header: 'Maliyet', value: 'maliyet' },
        { header: 'Liste Fiyat', value: 'listeFiyat' },
        { header: 'Indirimli Fiyat', value: 'indirimliFiyat' },
        { header: 'Rakip Fiyat Ortalamasi', value: 'rakipFiyatOrtalamasi' },
        { header: 'En Ucuz Satici', value: 'enUcuzSatici' },
        { header: 'Onerilen Fiyat', value: 'onerilenFiyat' },
        { header: 'Kar Orani', value: (row) => (row.karOrani > 0 ? `${Math.round(row.karOrani)}%` : '-') },
        { header: 'Karlilik Ihlali', value: 'karlilikIhlali' },
        { header: 'Guncelleme Saati', value: 'guncellemeSaati' },
      ],
    });
  };

  return (
    <div className="page-shell w-full max-w-none">
      
      {/* Header */}
      <div>
        <h1 className="page-title">Ürün Fiyat Analizi</h1>
        <p className="page-subtitle">Önerilen fiyatları gözden geçirin, karşılaştırın ve onaylayın</p>
      </div>

      {/* KPI Row */}
      <div className="flex gap-6 overflow-x-auto pb-2">
        <StatCard value={kpis.toplam_urun || 0} title="Toplam Ürün" />
        <StatCard value={kpis.fiyat_avantajli_urun || 0} title="Fiyat Avantajlı Ürün" />
        <StatCard value={kpis.fiyat_dezavantajli_urun || 0} title="Fiyat Dezavantajlı Ürün" />
        <StatCard value={kpis.kritik_farki_olan_urunler || 0} title="Kritik Farkı Olan Ürünler" />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 mt-2">
        <button className="btn-secondary" onClick={handleExcelExport} disabled={filteredUrunler.length === 0}>
          <FileSpreadsheet size={16} />
          Excel'e Aktar
        </button>
        
        <div className="relative w-64">
          <input 
            type="text" 
            placeholder="Stok kodu ara" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input rounded-lg pr-10"
          />
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        
        <button onClick={() => setShowFilters((v) => !v)} className="btn-secondary px-3 py-2">
          <Filter size={16} />
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
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[5%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead className="table-head">
              <tr>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Stok Kodu</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Marka</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Kategori</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Toplam Stok</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Maliyet</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Liste Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">İndirimli Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Rakip Fiyat Ortalaması</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">En Ucuz Satıcı</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Önerilen Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Kâr Oranı</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Karlılık İhlali</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Güncelleme Saati</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Fotoğraf</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 text-center break-words">Detay</th>
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
                    <tr className={`table-row ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-all">{u.stokKodu}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.marka}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.kategori}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.toplamStok}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.maliyet > 0 ? u.maliyet : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.listeFiyat > 0 ? u.listeFiyat : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.indirimliFiyat > 0 ? u.indirimliFiyat : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.rakipFiyatOrtalamasi > 0 ? Math.round(u.rakipFiyatOrtalamasi) : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.enUcuzSatici}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.onerilenFiyat > 0 ? u.onerilenFiyat : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.karOrani > 0 ? `%${Math.round(u.karOrani)}` : '-'}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.karlilikIhlali}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 break-words">{u.guncellemeSaati}</td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200">
                      <ProductThumb
                        src={u.fotograf}
                        alt={u.stokKodu || 'Urun'}
                        wrapperClassName="w-8 h-8 mx-auto flex items-center justify-center"
                        className="max-w-full max-h-full object-contain"
                      />
                    </td>
                    <td className="px-2 py-2 text-xs align-top border-r border-gray-200 text-center">
                      <button 
                        onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                        className="text-gray-500 hover:text-black focus:outline-none"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
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

