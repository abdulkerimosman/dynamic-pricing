import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Users, Upload, Download, Info } from 'lucide-react';
import api from '../api';

function ParametrelerTab() {
  return (
    <div className="py-8 px-8 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-12">
        <label className="text-base text-gray-800 font-medium flex-1">
          Rakip Fiyat Farkı Yüksek Ürünler Uyarısı
        </label>
        <div className="w-2/3">
          <input 
            type="text" 
            placeholder="% Yüzdesel değer giriniz"
            className="form-input text-center"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-12">
        <label className="text-base text-gray-800 font-medium flex-1">
          Rekabet Katsayısı
        </label>
        <div className="w-2/3">
          <input 
            type="text" 
            placeholder="Ondalık bir sayı giriniz"
            className="form-input text-center"
          />
        </div>
      </div>
    </div>
  );
}

function ImportExportTab() {
  return (
    <div className="p-8 space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Veri Aktarım İşlemleri</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Ürün Maliyetleri Import', desc: 'CSV/Excel maliyet dosyası yükle' },
          { title: 'Rakip Fiyatlar Import', desc: 'Sisteme rakip fiyat verisi aktar' },
          { title: 'Fiyat Önerileri Export', desc: 'Oluşturulan önerileri Excel formatında indir' },
          { title: 'Satış Raporları Export', desc: 'Kanal bazlı satış performans raporu al' },
        ].map((item, i) => (
          <div key={i} className="panel p-6 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
            <button className="btn-secondary">
              İşlemi Başlat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function KullaniciAyarlariTab() {
  const { data = [] } = useQuery({
    queryKey: ['kullanicilar'],
    queryFn: () => api.get('/kullanicilar').then(r => r.data),
  });

  return (
    <div className="p-8 space-y-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Sistem Kullanıcıları</h3>
      <div className="table-shell">
        <table className="w-full text-left">
          <thead className="table-head">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Ad Soyad</th>
              <th className="px-6 py-4 font-semibold text-gray-600">E-posta</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(k => (
              <tr key={k.kullanici_id} className="table-row">
                <td className="px-6 py-4 font-medium text-gray-900">{k.ad_soyad}</td>
                <td className="px-6 py-4 text-gray-600">{k.eposta}</td>
                <td className="px-6 py-4">
                  {k.Rols?.map(r => <span key={r.rol_id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1">{r.rol_adi}</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Ayarlar() {
  const [activeTab, setActiveTab] = useState('parametreler');

  const tabs = [
    { id: 'parametreler', label: 'Parametreler' },
    { id: 'importexport', label: 'Import Export' },
    { id: 'kullanicilar', label: 'Kullanıcı Ayarları' },
  ];

  return (
    <div className="page-shell max-w-[1400px]">
      <div>
        <h1 className="page-title">Ayarlar & Import/Export</h1>
        <p className="page-subtitle">Parametreleri yönetin, veri aktarım süreçlerini başlatın ve kullanıcı rollerini görüntüleyin</p>
      </div>

      {/* Tabs Layout */}
      <div className="relative">
        {/* Tab Buttons */}
        <div className="flex gap-1 ml-0 border-b border-gray-200 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-6 py-2.5 text-base transition-all duration-200 rounded-md
                ${activeTab === tab.id 
                  ? 'bg-gray-100 text-gray-900 font-semibold' 
                  : 'bg-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="panel min-h-[500px] shadow-none">
          {activeTab === 'parametreler' && <ParametrelerTab />}
          {activeTab === 'importexport' && <ImportExportTab />}
          {activeTab === 'kullanicilar' && <KullaniciAyarlariTab />}
        </div>
      </div>
    </div>
  );
}

