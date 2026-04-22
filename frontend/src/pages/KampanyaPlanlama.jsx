import { useEffect, useRef, useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import api from '../api';
import ProductThumb from '../components/ProductThumb';
import FilterSelect from '../components/FilterSelect';
import { exportRowsToExcelCsv } from '../utils/excelExport';

function KomisyonAnalizRow({ urun, kanalId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['komisyon-analizi', kanalId, urun.stokKodu],
    queryFn: () => api.get(`/kampanya/komisyon/${kanalId}/${encodeURIComponent(urun.stokKodu)}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={16} className="py-10 bg-white border-b border-gray-200">
          <Loader2 className="animate-spin text-gray-400 mx-auto" size={24} />
        </td>
      </tr>
    );
  }

  if (!data) {
    return (
      <tr>
        <td colSpan={16} className="py-10 bg-red-50 text-center text-red-500 border-b border-red-200">
          Detay verisi yüklenemedi.
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-white border-b border-gray-200">
      <td colSpan={16} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300 w-full">
          
          <h3 className="text-xl font-semibold text-gray-900 mb-6 bg-gray-100/50 inline-block px-4 py-2 rounded">Komisyon Analizleri</h3>

          {/* Table 1: Tiers */}
          <div className="border border-gray-200 rounded overflow-hidden mb-8 shadow-sm">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[9%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-[#fcfdfd] border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">1. Fiyat Alt Limit</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">2. Fiyat Üst Limiti</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">2. Fiyat Alt Limit</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">3. Fiyat Üst Limiti</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">3. Fiyat Alt Limit</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">4. Fiyat Üst Limiti</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">1. Komisyon</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">2. Komisyon</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">3. Komisyon</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">4. Komisyon</th>
                  <th className="px-2 py-2 text-[11px] leading-tight font-semibold text-gray-800 break-words">Komisyona Esas Fiyat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 last:border-none text-gray-700 bg-white hover:bg-gray-50">
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatAltLimit1}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatUstLimit2}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatAltLimit2}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatUstLimit3}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatAltLimit3}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.fiyatUstLimit4}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.komisyon1}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.komisyon2}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.komisyon3}</td>
                  <td className="px-2 py-2 text-[11px] border-r border-gray-200 break-words">{data.komisyon4}</td>
                  <td className="px-2 py-2 text-[11px] font-medium text-gray-900 bg-white/50 break-words">{data.komisyonaEsasFiyat}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </td>
    </tr>
  );
}
export default function KampanyaPlanlama() {
  const [selectedKanal, setSelectedKanal] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSezon, setSelectedSezon] = useState('');
  const [selectedCinsiyet, setSelectedCinsiyet] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('');
  const [isWorkbookProcessing, setIsWorkbookProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const {
    data: kanallar,
    isLoading: loadingKanallar,
    isError: kanalError,
    error: kanalErrorDetail,
  } = useQuery({
    queryKey: ['kanallar-pazaryeri'],
    queryFn: () => api.get('/kampanya/kanallar').then(r => r.data),
  });

  // Default to first channel if none selected when channels are loaded.
  useEffect(() => {
    if (!selectedKanal && kanallar?.length) {
      setSelectedKanal(String(kanallar[0].kanal_id));
    }
  }, [kanallar, selectedKanal]);

  const {
    data: urunler,
    isLoading: loadingUrunler,
    isError: urunError,
    error: urunErrorDetail,
  } = useQuery({
    queryKey: ['kampanya-urunler', selectedKanal],
    queryFn: () => api.get(`/kampanya/urunler/${selectedKanal}`).then(r => r.data),
    enabled: !!selectedKanal
  });

  const urunListesi = urunler || [];
  const sezonOptions = Array.from(new Set(urunListesi.map((u) => u.sezon).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const cinsiyetOptions = Array.from(new Set(urunListesi.map((u) => u.cinsiyet).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));
  const kategoriOptions = Array.from(new Set(urunListesi.map((u) => u.kategori).filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), 'tr'));

  const filteredUrunler = urunListesi.filter((u) => {
    const searchMatch = search === '' ||
      (u.stokKodu && u.stokKodu.toLowerCase().includes(search.toLowerCase())) ||
      (u.stokAdi && u.stokAdi.toLowerCase().includes(search.toLowerCase())) ||
      (u.barkod && u.barkod.toLowerCase().includes(search.toLowerCase()));
    const sezonMatch = !selectedSezon || u.sezon === selectedSezon;
    const cinsiyetMatch = !selectedCinsiyet || u.cinsiyet === selectedCinsiyet;
    const kategoriMatch = !selectedKategori || u.kategori === selectedKategori;
    return searchMatch && sezonMatch && cinsiyetMatch && kategoriMatch;
  });

  const handleExcelExport = () => {
    exportRowsToExcelCsv({
      rows: filteredUrunler,
      fileName: 'kampanya_planlama',
      columns: [
        { header: 'Stok Kodu', value: 'stokKodu' },
        { header: 'Stok Adi', value: 'stokAdi' },
        { header: 'Marka', value: 'marka' },
        { header: 'Cinsiyet', value: 'cinsiyet' },
        { header: 'Sezon', value: 'sezon' },
        { header: 'Kategori', value: 'kategori' },
        { header: 'Barkod', value: 'barkod' },
        { header: 'Toplam Stok', value: 'toplamStok' },
        { header: 'Maliyet', value: 'maliyet' },
        { header: 'Website Liste Fiyat', value: 'webListeFiyat' },
        { header: 'Website Indirimli', value: 'webIndirimliFiyat' },
        { header: 'Website Indirim Yuzde', value: (row) => (row.webIndirimYuzde > 0 ? `${row.webIndirimYuzde}%` : '-') },
        { header: 'Pazaryeri Liste Fiyat', value: 'pyListeFiyati' },
        { header: 'Pazaryeri Indirimli', value: 'pyIndirimliFiyati' },
        { header: 'Pazaryeri Indirim Yuzde', value: (row) => (row.pyIndirimYuzde > 0 ? `${row.pyIndirimYuzde}%` : '-') },
        { header: 'Guncel PY Satis Fiyati', value: 'guncelPySatisFiyati' },
      ],
    });
  };

  const handleWorkbookUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsWorkbookProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/kampanya/dosya-isle', formData, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const downloadName = `${file.name.replace(/\.[^.]+$/, '')}_selected.xlsx`;
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error?.response?.data?.error || error?.message || 'Workbook islemi basarisiz.';
      window.alert(message);
    } finally {
      setIsWorkbookProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <div className="page-shell w-full max-w-none">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Kampanya Planlama</h1>
          <p className="page-subtitle">Komisyona esas fiyatı seçip kampanya dosyasını işleyin</p>
        </div>
      </div>

      {/* Kanal Secici (Dropdown) */}
      <div className="panel p-4 flex items-center gap-4">
        <label className="text-gray-700 font-medium">Pazaryeri Seçiniz:</label>
        {loadingKanallar ? (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        ) : (
          <FilterSelect
            value={selectedKanal} 
            onChange={e => setSelectedKanal(e.target.value)}
            className="min-w-[220px] max-w-[320px]"
            selectClassName="h-12"
            disabled={!kanallar?.length}
          >
            <option value="" disabled>
              {kanallar?.length ? 'Pazaryeri seçiniz' : 'Pazaryeri bulunamadı'}
            </option>
            {kanallar?.map(k => (
              <option key={k.kanal_id} value={k.kanal_id}>{k.kanal_adi}</option>
            ))}
          </FilterSelect>
        )}
      </div>

      {kanalError && (
        <div className="panel p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          Pazaryeri listesi alınamadı: {kanalErrorDetail?.response?.data?.error || kanalErrorDetail?.message || 'Bilinmeyen hata'}
        </div>
      )}

      {urunError && (
        <div className="panel p-4 border-red-200 bg-red-50 text-red-700 text-sm">
          Ürün listesi alınamadı: {urunErrorDetail?.response?.data?.error || urunErrorDetail?.message || 'Bilinmeyen hata'}
        </div>
      )}

      {/* Selected Channel Context / Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {kanallar?.find(k => k.kanal_id.toString() === selectedKanal)?.kanal_adi || 'Pazaryeri'}
        </h2>
        
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={handleExcelExport} disabled={filteredUrunler.length === 0}>
            <FileSpreadsheet size={16} />
            Excel'e Aktar
          </button>

          <button
            className="btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isWorkbookProcessing}
          >
            <FileSpreadsheet size={16} />
            {isWorkbookProcessing ? 'İşleniyor...' : 'Excel Yükle ve İşle'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleWorkbookUpload}
          />
          
          <div className="relative w-64">
            <input 
              type="text" 
              placeholder="Stok kodu / Barkod / İsim ara" 
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
      <div className="table-shell text-xs">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-left border-collapse">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[12%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[5%]" />
              <col className="w-[5%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[5%]" />
              <col className="w-[6%]" />
              <col className="w-[6%]" />
              <col className="w-[5%]" />
              <col className="w-[6%]" />
              <col className="w-[4%]" />
              <col className="w-[4%]" />
            </colgroup>
            <thead className="table-head">
              <tr>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Stok Kodu</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Stok Adı</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Marka</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Kategori</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Barkod</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Toplam Stok</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Maliyet</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Website Liste Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Website İndirimli</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Website İndirim %</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Pazaryeri Liste Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Pazaryeri İndirimli</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Pazaryeri İndirim %</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Komisyona Esas Fiyat</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 break-words">Fotoğraf</th>
                <th className="px-2 py-2 text-[11px] leading-tight font-semibold border-r border-gray-200 text-center break-words">Komisyon Analizleri</th>
              </tr>
            </thead>
            <tbody>
              {loadingUrunler ? (
                <tr>
                  <td colSpan={16} className="text-center py-10">
                    <Loader2 size={24} className="animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : filteredUrunler.length > 0 ? (
                filteredUrunler.map((u, i) => (
                  <Fragment key={u.stokKodu || i}>
                    <tr className={`table-row ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-all">{u.stokKodu}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 max-w-[240px] truncate" title={u.stokAdi}>{u.stokAdi}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.marka}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.kategori}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.barkod}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.toplamStok || 0}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.maliyet > 0 ? Math.round(u.maliyet) : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.webListeFiyat > 0 ? Math.round(u.webListeFiyat) : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.webIndirimliFiyat > 0 ? Math.round(u.webIndirimliFiyat) : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.webIndirimYuzde > 0 ? `%${u.webIndirimYuzde}` : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.pyListeFiyati > 0 ? u.pyListeFiyati : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.pyIndirimliFiyati > 0 ? u.pyIndirimliFiyati : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{u.pyIndirimYuzde > 0 ? `%${u.pyIndirimYuzde}` : '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 break-words">{Math.round(u.guncelPySatisFiyati) || '-'}</td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200">
                        <ProductThumb
                          src={u.fotograf}
                          alt={u.stokKodu || 'Urun'}
                          wrapperClassName="w-8 h-8 mx-auto flex items-center justify-center"
                          className="max-w-full max-h-full object-contain mix-blend-multiply"
                        />
                      </td>
                      <td className="px-2 py-2 text-[11px] align-top border-r border-gray-200 text-center">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                          className="text-gray-500 hover:text-black focus:outline-none"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedRow === u.stokKodu && <KomisyonAnalizRow urun={u} kanalId={selectedKanal} />}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="text-center py-6 text-gray-400">Veri bulunamadı</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

