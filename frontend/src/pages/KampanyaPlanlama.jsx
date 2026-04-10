import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import api from '../api';

function KomisyonAnalizRow({ urun, kanalId }) {
  const [selectedKomisyon, setSelectedKomisyon] = useState('13');

  const { data, isLoading } = useQuery({
    queryKey: ['komisyon-analizi', kanalId, urun.stokKodu],
    queryFn: () => api.get(`/kampanya/komisyon/${kanalId}/${urun.stokKodu}`).then(r => r.data),
  });

  if (isLoading) {
    return (
      <tr>
        <td colSpan={16} className="py-10 bg-gray-50 border-b border-gray-200">
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

  // Calculate What If logic
  const komisyonOrani = parseFloat(selectedKomisyon) || 13;
  // Based on the given commission, the corresponding target price would ideally be its limit, but for simplicity, 
  // users will calculate profit mathematically
  const oncekiKarTutar = data.guncelPySatisFiyati - data.maliyet - (data.guncelPySatisFiyati * (13 / 100)); // assuming 13 was default
  const oncekiKarOran = data.maliyet > 0 ? (oncekiKarTutar / data.maliyet) * 100 : 0;
  
  // What if it's the exact same price but the new selected commission rate?
  const yeniKarTutar = data.guncelPySatisFiyati - data.maliyet - (data.guncelPySatisFiyati * (komisyonOrani / 100));
  const yeniKarOran = data.maliyet > 0 ? (yeniKarTutar / data.maliyet) * 100 : 0;
  
  // Guardrail check: both Product Category target and Channel Minimum rule
  const isIhlal = yeniKarOran < data.minKarOrani || yeniKarOran < data.kanalMinKarOrani;
  const ihlal = isIhlal ? 'Evet' : 'Hayır';

  return (
    <tr className="bg-white border-b border-gray-300">
      <td colSpan={16} className="p-0">
        <div className="p-8 animate-in slide-in-from-top-2 duration-300 w-full overflow-x-auto">
          
          <h3 className="text-xl font-semibold text-gray-900 mb-6 bg-gray-100/50 inline-block px-4 py-2 rounded">Komisyon Analizleri</h3>

          {/* Table 1: Tiers */}
          <div className="border border-gray-200 rounded overflow-hidden mb-8 shadow-sm">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-[#fcfdfd] border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">1. Fiyat Alt Limit</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">2. Fiyat Üst Limiti</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">2. Fiyat Alt Limit</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">3. Fiyat Üst Limiti</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">3. Fiyat Alt Limit</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">4. Fiyat Üst Limiti</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">1. Komisyon</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">2. Komisyon</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">3. Komisyon</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">4. Komisyon</th>
                  <th className="px-4 py-3 font-semibold text-gray-800">Komisyona Esas Fiyat</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 last:border-none text-gray-700 bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatAltLimit1}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatUstLimit2}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatAltLimit2}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatUstLimit3}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatAltLimit3}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.fiyatUstLimit4}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.komisyon1}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.komisyon2}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.komisyon3}</td>
                  <td className="px-4 py-3 border-r border-gray-100">{data.komisyon4}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 bg-gray-50/50">{data.komisyonaEsasFiyat}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="text-sm font-bold text-gray-800 mb-3 border-b-2 inline-block border-gray-200 pb-1">What If Analizi</h4>

          {/* Table 2: What If Analysis */}
          <div className="border border-gray-200 rounded overflow-hidden shadow-sm max-w-[80%]">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-[#fcfdfd] border-b border-gray-200 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Güncel Komisyon</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Güncel PY Satış Fiyatı</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Karlılık İhlali</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Önceki Karlılık Or.</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Yeni Karlılık Or.</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Yeni PYSF</th>
                  <th className="px-4 py-3 font-semibold border-r border-gray-100">Hesaplanan Komis.</th>
                  <th className="px-4 py-3 font-semibold">Tarife Son. Kadar Uyg.</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="px-4 py-2 border-r border-gray-100 min-w-[120px]">
                    <div className="relative">
                      <select 
                        value={selectedKomisyon} 
                        onChange={(e) => setSelectedKomisyon(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 focus:border-gray-500 outline-none appearance-none font-medium"
                      >
                        <option value={data.komisyon1}>{data.komisyon1}</option>
                        <option value={data.komisyon2}>{data.komisyon2}</option>
                        <option value={data.komisyon3}>{data.komisyon3}</option>
                        <option value={data.komisyon4}>{data.komisyon4}</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100 font-medium">{data.guncelPySatisFiyati}</td>
                  <td className="px-4 py-3 border-r border-gray-100">
                    <span className={ihlal === 'Evet' ? 'text-red-600 font-bold' : 'text-gray-700'}>{ihlal}</span>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100">{Math.round(oncekiKarOran)}%</td>
                  <td className="px-4 py-3 border-r border-gray-100">
                    <span className={ihlal === 'Evet' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{Math.round(yeniKarOran)}%</span>
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100 bg-gray-50 relative group cursor-help text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-3 border-r border-gray-100 bg-gray-50 relative group cursor-help text-gray-400">
                    -
                  </td>
                  <td className="px-4 py-3 bg-gray-50 relative group cursor-help text-gray-400">
                    -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </td>
    </tr>
  );
}

function KampanyaAyarlariModal({ onClose, kanallar }) {
  const [selectedKategori, setSelectedKategori] = useState('');
  const [selectedKanal, setSelectedKanal] = useState('');
  const [selectedKomisyon, setSelectedKomisyon] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: kategoriler } = useQuery({
    queryKey: ['kategoriler'],
    queryFn: () => api.get('/kampanya/kategoriler').then(r => r.data)
  });

  const { data: komisyonOranlari } = useQuery({
    queryKey: ['komisyon-oranlari', selectedKanal, selectedKategori],
    queryFn: () => api.get(`/kampanya/komisyon-oranlari/${selectedKanal}/${selectedKategori}`).then(r => r.data),
    enabled: !!selectedKanal && !!selectedKategori
  });

  const { data: analiz, isLoading: loadingAnaliz } = useQuery({
    queryKey: ['ayarlar-analiz', selectedKanal, selectedKategori, selectedKomisyon],
    queryFn: () => api.get(`/kampanya/ayarlar-analiz/${selectedKanal}/${selectedKategori}/${selectedKomisyon}`).then(r => r.data),
    enabled: !!selectedKanal && !!selectedKategori && !!selectedKomisyon
  });

  if (isConfirmOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl p-10 max-w-lg w-full text-center relative pointer-events-auto">
          <div className="absolute top-4 left-4 bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-semibold">Kampanya Ayarları Uyarı</div>
          <h2 className="text-2xl mt-8 mb-10 font-semibold text-gray-800">Onaylamak istediğinden emin misin?</h2>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => setIsConfirmOpen(false)} 
              className="bg-[#f05c4b] hover:bg-red-500 text-white font-medium py-3 px-10 rounded shadow transition-colors"
            >
              Hayır
            </button>
            <button 
              onClick={async () => {
                try {
                  await api.post('/kampanya/onay', {
                    kanalId: selectedKanal,
                    kategoriId: selectedKategori,
                    komisyonOrani: selectedKomisyon,
                    ortalamaKar: analiz?.ortalamaKar || 0,
                  });
                } catch(e) { /* continue even if it fails */ }
                setIsConfirmOpen(false);
                onClose();
              }} 
              className="bg-[#3da9fc] hover:bg-blue-500 text-white font-medium py-3 px-10 rounded shadow transition-colors"
            >
              Evet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-6xl w-full mx-4 h-[80vh] overflow-y-auto relative pointer-events-auto flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="absolute top-4 left-4 bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-semibold">Kampanya Ayarları</div>

        <h2 className="text-2xl mt-8 mb-8 font-semibold text-gray-900 border-b border-gray-100 pb-4">Genel Kategori Bazlı Komisyon What İf Analizi</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kategori Seçiniz</label>
            <select value={selectedKategori} onChange={e => setSelectedKategori(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gray-500">
              <option value="">Seçiniz</option>
              {kategoriler?.map(k => <option key={k.kategori_id} value={k.kategori_id}>{k.kategori_adi}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Kanal Seçiniz</label>
            <select value={selectedKanal} onChange={e => setSelectedKanal(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gray-500">
              <option value="">Seçiniz</option>
              {kanallar?.map(k => <option key={k.kanal_id} value={k.kanal_id}>{k.kanal_adi}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Komisyon Oranı Seçiniz</label>
            <select value={selectedKomisyon} onChange={e => setSelectedKomisyon(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-gray-500" disabled={!komisyonOranlari?.length}>
              <option value="">Seçiniz</option>
              {komisyonOranlari?.map((ko, i) => <option key={i} value={ko.oran}>{ko.oran}</option>)}
            </select>
          </div>
        </div>

        {selectedKomisyon && (
          <div className="flex gap-16 relative flex-grow">
            {/* Left KPIs */}
            <div className="flex gap-6 relative z-10 w-full max-w-3xl">
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-gray-700 mb-2">Ortalama Kar</span>
                <div className="bg-gray-50 flex items-center justify-center p-8 rounded shadow-sm flex-1">
                  <span className="text-3xl font-light text-gray-800">{loadingAnaliz ? <Loader2 className="animate-spin" /> : `%${analiz?.ortalamaKar}`}</span>
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-gray-700 mb-2">Kanal Kar Hedefi</span>
                <div className="bg-gray-50 flex items-center justify-center p-8 rounded shadow-sm flex-1">
                  <span className="text-3xl font-light text-gray-800">{loadingAnaliz ? '-' : `%${analiz?.kanalKarHedefi}`}</span>
                </div>
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-sm font-semibold text-gray-700 mb-2">Kategori Kar Hedefi</span>
                <div className="bg-gray-50 flex items-center justify-center p-8 rounded shadow-sm flex-1">
                  <span className="text-3xl font-light text-gray-800">{loadingAnaliz ? '-' : `%${analiz?.kategoriKarHedefi}`}</span>
                </div>
              </div>
              <div className="flex flex-col flex-1 relative group">
                <span className="text-sm font-semibold text-gray-700 mb-2 leading-tight">Karlılık İhlali Eden Ürün Sayısı</span>
                <div className="bg-red-200 flex items-center justify-center p-8 rounded shadow-sm flex-1 cursor-pointer transition-colors hover:bg-red-300">
                  <span className="text-3xl font-medium text-gray-800">{loadingAnaliz ? '-' : analiz?.ihlalEdenUrunSayisi}</span>
                </div>

                {/* Arrow pointing to tooltip */}
                <div className="absolute top-[60%] sm:hidden lg:block -right-[50px] z-50 hidden group-hover:block pointer-events-none">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="transform rotate-0">
                    <path d="M5 20 C 15 20, 25 10, 35 15" stroke="#333" strokeWidth="3" fill="none"/>
                    <polygon points="32,10 38,16 30,20" fill="#333"/>
                  </svg>
                </div>

                {/* Hover / Tooltip List */}
                <div className="absolute left-[110%] top-[20%] w-[350px] bg-gray-50 border border-gray-200 shadow-xl rounded p-4 hidden group-hover:block z-50">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="pb-2 font-semibold">Fotoğraf</th>
                        <th className="pb-2 font-semibold">Stok kodu</th>
                        <th className="pb-2 font-semibold">Marka</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analiz?.ihlaller?.length > 0 ? analiz.ihlaller.map((iu, idx) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-none">
                          <td className="py-2">
                            <img src={iu.fotograf} className="w-8 h-8 object-contain mix-blend-multiply" />
                          </td>
                          <td className="py-2">{iu.stokKodu}</td>
                          <td className="py-2">{iu.marka}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="py-4 text-center text-gray-400">İhlal bulunmuyor.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto flex justify-center pt-8 border-t border-gray-100 w-full relative z-10 block">
          <button 
            disabled={!selectedKomisyon}
            onClick={() => setIsConfirmOpen(true)}
            className="bg-[#f05c4b] hover:bg-red-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-16 rounded shadow transition-colors"
          >
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KampanyaPlanlama() {
  const [selectedKanal, setSelectedKanal] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [isAyarlarOpen, setIsAyarlarOpen] = useState(false);

  const { data: kanallar, isLoading: loadingKanallar } = useQuery({
    queryKey: ['kanallar-pazaryeri'],
    queryFn: () => api.get('/kampanya/kanallar').then(r => r.data),
  });

  // Default to first channel if none selected when loaded
  if (kanallar && kanallar.length > 0 && selectedKanal === '') {
    setSelectedKanal(kanallar[0].kanal_id.toString());
  }

  const { data: urunler, isLoading: loadingUrunler } = useQuery({
    queryKey: ['kampanya-urunler', selectedKanal],
    queryFn: () => api.get(`/kampanya/urunler/${selectedKanal}`).then(r => r.data),
    enabled: !!selectedKanal
  });

  const filteredUrunler = (urunler || []).filter(u => 
    search === '' || 
    (u.stokKodu && u.stokKodu.toLowerCase().includes(search.toLowerCase())) ||
    (u.stokAdi && u.stokAdi.toLowerCase().includes(search.toLowerCase())) ||
    (u.barkod && u.barkod.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-[1500px]">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-gray-900">Kampanya Planlama</h1>
        <button 
          onClick={() => setIsAyarlarOpen(true)}
          className="bg-[#f05c4b] hover:bg-red-500 text-white px-6 py-2 rounded shadow-sm flex items-center justify-center text-sm font-medium transition-colors"
        >
          Kampanya Ayarları
        </button>
      </div>

      {/* Kanal Secici (Dropdown) */}
      <div className="flex items-center gap-4 bg-white p-4 rounded border border-gray-200">
        <label className="text-gray-700 font-medium">Pazaryeri Seçiniz:</label>
        {loadingKanallar ? (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        ) : (
          <select 
            value={selectedKanal} 
            onChange={e => setSelectedKanal(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 min-w-[200px] outline-none focus:border-gray-500"
          >
            {kanallar?.map(k => (
              <option key={k.kanal_id} value={k.kanal_id}>{k.kanal_adi}</option>
            ))}
          </select>
        )}
      </div>

      {/* Selected Channel Context / Action Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <h2 className="text-2xl font-semibold text-gray-800">
          {kanallar?.find(k => k.kanal_id.toString() === selectedKanal)?.kanal_adi || 'Pazaryeri'}
        </h2>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded shadow-sm text-sm font-medium transition-colors">
            <FileSpreadsheet size={16} />
            Excel'e Aktar
          </button>
          
          <div className="relative w-64">
            <input 
              type="text" 
              placeholder="Stok kodu / Barkod / İsim ara" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-full px-4 py-1.5 text-sm outline-none focus:border-gray-400"
            />
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded border border-transparent font-medium border-gray-300">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 bg-white overflow-hidden text-xs rounded">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-300 text-gray-700">
              <tr>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Stok Kodu</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Maliyet</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Website Liste Fiyat</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Website İndirimli $</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200 leading-tight">Website İndirim %</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200 leading-tight">Pazaryeri İndirim %</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Pazaryeri Liste Fiyat</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Pazaryeri İndirimli $</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200 text-center">Komisyon Analizleri</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Fotoğraf</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Marka</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Toplam Stok</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Stok Adı</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Kategori</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Barkod</th>
                <th className="px-3 py-3 font-semibold border-r border-gray-200">Güncel PY Satış Fiyatı</th>
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
                    <tr className={`border-b border-gray-200 hover:bg-gray-50 text-gray-700 ${expandedRow === u.stokKodu ? 'bg-gray-50' : ''}`}>
                      <td className="px-3 py-3 border-r border-gray-200">{u.stokKodu}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.maliyet > 0 ? Math.round(u.maliyet) : '-'}</td>
                      
                      <td className="px-3 py-3 border-r border-gray-200">{u.webListeFiyat > 0 ? Math.round(u.webListeFiyat) : '-'}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.webIndirimliFiyat > 0 ? Math.round(u.webIndirimliFiyat) : '-'}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.webIndirimYuzde > 0 ? `%${u.webIndirimYuzde}` : '-'}</td>
                      
                      <td className="px-3 py-3 border-r border-gray-200">{u.pyIndirimYuzde > 0 ? `%${u.pyIndirimYuzde}` : '-'}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.pyListeFiyati > 0 ? u.pyListeFiyati : '-'}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.pyIndirimliFiyati > 0 ? u.pyIndirimliFiyati : '-'}</td>
                      
                      <td className="px-3 py-3 border-r border-gray-200 text-center">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === u.stokKodu ? null : u.stokKodu)}
                          className="text-gray-500 hover:text-black focus:outline-none"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200">
                        {u.fotograf ? (
                          <div className="w-8 h-8 mx-auto flex items-center justify-center">
                            <img src={u.fotograf} alt="" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 mx-auto flex items-center justify-center text-[10px] text-gray-400">İmage</div>
                        )}
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.marka}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.toplamStok || 0}</td>
                      <td className="px-3 py-3 border-r border-gray-200 max-w-[200px] truncate" title={u.stokAdi}>{u.stokAdi}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.kategori}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{u.barkod}</td>
                      <td className="px-3 py-3 border-r border-gray-200">{Math.round(u.guncelPySatisFiyati) || '-'}</td>
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

      {isAyarlarOpen && <KampanyaAyarlariModal onClose={() => setIsAyarlarOpen(false)} kanallar={kanallar} />}
    </div>
  );
}
