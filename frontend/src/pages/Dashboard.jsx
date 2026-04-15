import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../api';
import ProductThumb from '../components/ProductThumb';

// One color per channel (consistent across renders)
const CHANNEL_COLORS = ['#e11d48', '#0284c7', '#16a34a', '#d97706', '#7c3aed'];

function KpiCard({ value, label, labelRed }) {
  return (
    <div className="panel p-5 flex flex-col justify-center items-start min-h-[118px]">
      <div className="text-xs font-semibold tracking-wide uppercase text-gray-500 mb-2">{label}</div>
      <div className={`text-4xl font-semibold ${labelRed ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedChannels, setSelectedChannels] = useState([]);

  const { data: kanallar } = useQuery({
    queryKey: ['kanallar-slicer'],
    queryFn: () => api.get('/dashboard/kanallar').then(r => r.data)
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard', selectedYear, selectedChannels],
    queryFn: () => api.get('/dashboard', {
      params: { year: selectedYear, channels: selectedChannels.join(',') }
    }).then(r => r.data)
  });

  const { data: alertTables } = useQuery({
    queryKey: ['dashboard-uyarilar', selectedChannels],
    queryFn: () => api.get('/dashboard/uyarilar-tablosu', {
      params: { channels: selectedChannels.join(',') }
    }).then(r => r.data)
  });

  const toggleChannel = (kanal_id) => {
    setSelectedChannels(prev =>
      prev.includes(kanal_id) ? prev.filter(id => id !== kanal_id) : [...prev, kanal_id]
    );
  };

  const years = ['2026', '2025', '2024'];

  // Determine which channel lines to render
  const kanalAdlari = dashboardData?.kanal_adlari || {};
  const aktifKanalIds = dashboardData?.aktif_kanal_ids || [];

  return (
    <div className="page-shell min-h-screen">

      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Kanal bazlı performans, hedef gerçekleşme ve operasyonel uyarılar</p>
      </div>

      {/* KPI Row - full width */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          value={`%${((dashboardData?.karlilik_orani || 0) * 100).toFixed(0)}`}
          label="Karlılık Oranı"
        />
        <KpiCard
          value={dashboardData?.fiyat_degisim_oneri || 0}
          label="Fiyat Değişim Öneri"
        />
        <KpiCard
          value={`%${((dashboardData?.aylik_ciro_hedefi_gerceklesmis || 0) * 100).toFixed(0)}`}
          label="Aylık Ciro Hedefi Gerçekleşmiş"
        />
        <KpiCard
          value={dashboardData?.aktif_uyari || 0}
          label="Aktif Uyarı"
        />
      </div>

      {/* Filters (25%) + Graph (75%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <div className="panel p-5">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Kanallar</h3>
            <div className="space-y-3">
              {(kanallar || []).map(k => (
                <label key={k.kanal_id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-black grayscale border-gray-200 rounded-sm"
                    checked={selectedChannels.includes(k.kanal_id)}
                    onChange={() => toggleChannel(k.kanal_id)}
                  />
                  <span className="text-gray-700 font-medium">{k.kanal_adi}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Yıl</h3>
            <div className="space-y-3">
              {years.map(y => (
                <label key={y} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-black grayscale border-gray-200 rounded-sm"
                    checked={selectedYear === y}
                    onChange={() => setSelectedYear(y)}
                  />
                  <span className="text-gray-700 font-medium">{y}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 panel p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Satış Performansı (Seçilen Yıl: {selectedYear})
          </h2>
          <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dashboardData?.grafik_verisi || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ay" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => v ? `${(v/1000000).toFixed(2)}M ₺` : '—'} />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />

              {/* Confidence band */}
              <Area
                name="Güven Aralığı (Tahmin)"
                type="monotone"
                dataKey="tahmin_araligi"
                stroke="none"
                fill="#bae6fd"
                fillOpacity={0.5}
              />

              {/* One line per active channel */}
              {aktifKanalIds.map((kId, idx) => (
                <Line
                  key={`kanal_${kId}`}
                  name={kanalAdlari[kId] || `Kanal ${kId}`}
                  type="monotone"
                  dataKey={`kanal_${kId}`}
                  stroke={CHANNEL_COLORS[idx % CHANNEL_COLORS.length]}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={false}
                />
              ))}

              {/* Target line */}
              <Line
                name="Hedef Aylık Satış"
                type="monotone"
                dataKey="hedef"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />

              {/* Forecast line */}
              <Line
                name="ML Tahmini"
                type="monotone"
                dataKey="tahmin"
                stroke="#0284c7"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: 3 Alert Grids */}
      <div className="mt-1 shrink-0">
        <h2 className="text-xl font-bold text-red-600 mb-4">Uyarı</h2>
        <div className="grid grid-cols-3 gap-6">
        <AlertTableCard
          title="Rakip Fiyat Farkı Yüksek Ürünler"
          data={alertTables?.rakip_fiyat_farki}
          extraColLabel="Fark (%)"
          renderExtra={(item) => `%${parseFloat(item.fark_yuzdesi || 0).toFixed(1)}`}
        />
        <AlertTableCard
          title="Stok Riski Olan Ürünler"
          data={alertTables?.stok_riski}
          extraColLabel="Stok"
          renderExtra={(item) => item.stok}
        />
        <AlertTableCard
          title="Fiyat Alarmı Olan Ürünler"
          data={alertTables?.fiyat_alarmi}
          extraColLabel="Düşüş (%)"
          renderExtra={(item) => `%${item.dusus_yuzdesi}`}
        />
        </div>
      </div>

    </div>
  );
}

function AlertTableCard({ title, data, extraColLabel, renderExtra }) {
  return (
    <div className="panel p-4 flex flex-col h-80">
      <h3 className="text-lg font-semibold mb-4 text-center text-gray-800">
        {title}
      </h3>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs uppercase bg-gray-50 text-gray-500 sticky top-0">
            <tr>
              <th className="py-2 px-2 border-b">Fotoğraf</th>
              <th className="py-2 px-2 border-b">Stok Kodu</th>
              <th className="py-2 px-2 border-b">Marka</th>
              <th className="py-2 px-2 border-b text-right">{extraColLabel}</th>
            </tr>
          </thead>
          <tbody>
            {(data && data.length > 0) ? data.map((item, i) => (
              <tr key={i} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                <td className="py-2 px-2">
                  <ProductThumb
                    src={item.resim_url}
                    alt={item.stok_kodu || 'Urun'}
                    wrapperClassName="w-8 h-8"
                    className="w-8 h-8 object-contain"
                  />
                </td>
                <td className="py-2 px-2">{item.stok_kodu}</td>
                <td className="py-2 px-2">{item.marka_adi}</td>
                <td className="py-2 px-2 text-right font-medium text-gray-800">
                  {renderExtra(item)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-400">Veri bulunamadı</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

