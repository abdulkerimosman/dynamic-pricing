import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Settings, Users, Upload, Download, Info } from 'lucide-react';
import api from '../api';

function ParametrelerTab() {
  return (
    <div className="py-12 px-6 space-y-8 max-w-4xl">
      <div className="flex items-center justify-between gap-12">
        <label className="text-xl text-gray-800 font-medium flex-1">
          Rakip Fiyat Farkı Yüksek Ürünler Uyarısı
        </label>
        <div className="w-2/3">
          <input 
            type="text" 
            placeholder="% Yüzdesel değer giriniz"
            className="w-full border border-gray-300 rounded-md px-4 py-3 text-center text-gray-500 bg-white shadow-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-12">
        <label className="text-xl text-gray-800 font-medium flex-1">
          Rekabet Katsayısı
        </label>
        <div className="w-2/3">
          <input 
            type="text" 
            placeholder="Ondalık bir sayı giriniz"
            className="w-full border border-gray-300 rounded-md px-4 py-3 text-center text-gray-500 bg-white shadow-sm outline-none focus:border-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

function ImportExportTab() {
  return (
    <div className="p-12 space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Veri Aktarım İşlemleri</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: 'Ürün Maliyetleri Import', desc: 'CSV/Excel maliyet dosyası yükle' },
          { title: 'Rakip Fiyatlar Import', desc: 'Sisteme rakip fiyat verisi aktar' },
          { title: 'Fiyat Önerileri Export', desc: 'Oluşturulan önerileri Excel formatında indir' },
          { title: 'Satış Raporları Export', desc: 'Kanal bazlı satış performans raporu al' },
        ].map((item, i) => (
          <div key={i} className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
            </div>
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition-colors text-sm font-medium">
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
    <div className="p-12 space-y-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Sistem Kullanıcıları</h3>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-gray-600">Ad Soyad</th>
              <th className="px-6 py-4 font-semibold text-gray-600">E-posta</th>
              <th className="px-6 py-4 font-semibold text-gray-600">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(k => (
              <tr key={k.kullanici_id} className="hover:bg-gray-50">
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
    <div className="space-y-10 max-w-[1400px]">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900 mb-2">Ayarlar – Import/Export</h1>
      </div>

      {/* Tabs Layout */}
      <div className="relative">
        {/* Tab Buttons */}
        <div className="flex gap-0 ml-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-10 py-3 text-2xl transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-white border-2 border-b-0 border-gray-800 rounded-t-lg z-10 font-medium' 
                  : 'bg-transparent text-gray-600 hover:text-gray-900 mt-2 hover:bg-gray-50 rounded-t-lg'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="bg-white border-2 border-gray-800 rounded-lg -mt-[2px] min-h-[500px] shadow-sm">
          {activeTab === 'parametreler' && <ParametrelerTab />}
          {activeTab === 'importexport' && <ImportExportTab />}
          {activeTab === 'kullanicilar' && <KullaniciAyarlariTab />}
        </div>
      </div>
    </div>
  );
}
