import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';

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
  const [activeTab, setActiveTab] = useState('kullanicilar');

  const tabs = [
    { id: 'kullanicilar', label: 'Kullanıcı Ayarları' },
  ];

  return (
    <div className="page-shell max-w-[1400px]">
      <div>
        <h1 className="page-title">Ayarlar</h1>
        <p className="page-subtitle">Sistem kullanıcı ayarlarını yonetin</p>
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
          {activeTab === 'kullanicilar' && <KullaniciAyarlariTab />}
        </div>
      </div>
    </div>
  );
}

