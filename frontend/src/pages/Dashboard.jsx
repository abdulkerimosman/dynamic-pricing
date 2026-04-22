import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { FileSpreadsheet } from 'lucide-react';
import api from '../api';
import ProductThumb from '../components/ProductThumb';
import { exportRowsToExcelCsv } from '../utils/excelExport';

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
  const [selectedStokPeriod, setSelectedStokPeriod] = useState('30');
  const [selectedDropThreshold, setSelectedDropThreshold] = useState('10');

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
    queryKey: ['dashboard-uyarilar', selectedChannels, selectedStokPeriod, selectedDropThreshold],
    queryFn: () => api.get('/dashboard/uyarilar-tablosu', {
      params: {
        channels: selectedChannels.join(','),
        stok_period: selectedStokPeriod,
        drop_threshold: selectedDropThreshold
      }
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
          <h2 className="text-xl font-bold text-red-600">Uyarı</h2>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Bu tabloda her bölüm için yalnızca ilk 10 kayıt gösterilir. Tüm sonuçlar için "Excel&apos;e Aktar" butonunu kullanın.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AlertTableCard
          title="Rakip Fiyat Farkı Yüksek Ürünler"
          data={alertTables?.rakip_fiyat_farki}
          exportFileName="uyari_rakip_fiyat_farki"
          exportColumns={[
            { header: 'Urun ID', value: 'urun_id' },
            { header: 'Stok Kodu', value: 'stok_kodu' },
            { header: 'Marka', value: 'marka_adi' },
            { header: 'Bizim Fiyat (Liste)', value: (item) => parseFloat(item.bizim_fiyat || 0).toFixed(2) },
            { header: 'Rakip Fiyat (Baz)', value: (item) => parseFloat(item.en_ucuz_rakip || 0).toFixed(2) },
            { header: 'Fark (%)', value: (item) => parseFloat(item.fark_yuzdesi || 0).toFixed(2) },
            { header: 'Resim URL', value: 'resim_url' },
          ]}
          customColumns={[
            {
              label: 'Bizim Fiyat (Liste)',
              className: 'text-right',
              render: (item) => `${parseFloat(item.bizim_fiyat || 0).toFixed(2)} TL`
            },
            {
              label: 'Rakip Fiyat (Baz)',
              className: 'text-right',
              render: (item) => `${parseFloat(item.en_ucuz_rakip || 0).toFixed(2)} TL`
            }
          ]}
          extraColLabel="Fark (%)"
          renderExtra={(item) => `%${parseFloat(item.fark_yuzdesi || 0).toFixed(1)}`}
        />
        <AlertTableCard
          title="Kritik Düşük Stok"
          data={alertTables?.stok_kritik_dusuk}
          exportFileName="uyari_stok_kritik_dusuk"
          exportColumns={[
            { header: 'Urun ID', value: 'urun_id' },
            { header: 'Stok Kodu', value: 'stok_kodu' },
            { header: 'Marka', value: 'marka_adi' },
            { header: 'Toplam Stok', value: 'stok' },
            { header: 'Satilan Adet', value: 'satilan_adet' },
            { header: 'Devir Hizi (Adet/Gun)', value: 'devir_hizi_gunluk' },
            { header: 'Tahmini Tukenme (Gun)', value: 'tukenme_gunu' },
            { header: 'Son Satis Tarihi', value: (item) => item.son_satis_tarihi ? new Date(item.son_satis_tarihi).toLocaleString('tr-TR') : '-' },
            { header: 'Resim URL', value: 'resim_url' },
          ]}
          customColumns={[
            {
              label: 'Toplam Stok',
              className: 'text-right',
              render: (item) => item.stok
            },
            {
              label: 'Devir/Gün',
              className: 'text-right',
              render: (item) => parseFloat(item.devir_hizi_gunluk || 0).toFixed(2)
            }
          ]}
          extraColLabel="Tükenme (Gün)"
          renderExtra={(item) => item.tukenme_gunu !== null ? item.tukenme_gunu : '-'}
        />
        <AlertTableCard
          title="Fazla Stok"
          data={alertTables?.stok_fazlasi}
          exportFileName="uyari_stok_fazlasi"
          exportColumns={[
            { header: 'Urun ID', value: 'urun_id' },
            { header: 'Stok Kodu', value: 'stok_kodu' },
            { header: 'Marka', value: 'marka_adi' },
            { header: 'Toplam Stok', value: 'stok' },
            { header: 'Satilan Adet', value: 'satilan_adet' },
            { header: 'Devir Hizi (Adet/Gun)', value: 'devir_hizi_gunluk' },
            { header: 'Tahmini Tukenme (Gun)', value: 'tukenme_gunu' },
            { header: 'Son Satis Tarihi', value: (item) => item.son_satis_tarihi ? new Date(item.son_satis_tarihi).toLocaleString('tr-TR') : '-' },
            { header: 'Resim URL', value: 'resim_url' },
          ]}
          customColumns={[
            {
              label: 'Toplam Stok',
              className: 'text-right',
              render: (item) => item.stok
            },
            {
              label: 'Devir/Gün',
              className: 'text-right',
              render: (item) => parseFloat(item.devir_hizi_gunluk || 0).toFixed(2)
            }
          ]}
          extraColLabel="Tükenme (Gün)"
          renderExtra={(item) => item.tukenme_gunu !== null ? item.tukenme_gunu : 'Satış yok'}
        />
        <AlertTableCard
          title="Fiyat Alarmı Olan Ürünler"
          data={alertTables?.fiyat_alarmi}
          headerActions={(
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Eşik</span>
              {['5', '10', '15', '20'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`px-2 py-1 rounded-md text-[11px] font-medium border ${selectedDropThreshold === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  onClick={() => setSelectedDropThreshold(t)}
                >
                  %{t}
                </button>
              ))}
            </div>
          )}
          emptyStateText="Eşiği aşan rakip fiyat düşüşü bulunamadı. Bu liste için aynı rakipte en az 2 fiyat yüklemesi gerekir."
          exportFileName="uyari_fiyat_alarmlari"
          exportColumns={[
            { header: 'Urun ID', value: 'urun_id' },
            { header: 'Stok Kodu', value: 'stok_kodu' },
            { header: 'Marka', value: 'marka_adi' },
            { header: 'En Ucuz Rakip', value: 'en_ucuz_rakip' },
            { header: 'Eski Rakip Fiyati', value: (item) => parseFloat(item.eski_rakip_fiyati || 0).toFixed(2) },
            { header: 'Yeni Rakip Fiyati', value: (item) => parseFloat(item.yeni_rakip_fiyati || 0).toFixed(2) },
            { header: 'Bizim Fiyat', value: (item) => parseFloat(item.bizim_fiyat || 0).toFixed(2) },
            { header: 'Dusus (%)', value: (item) => parseFloat(item.dusus_yuzdesi || 0).toFixed(2) },
            { header: 'Resim URL', value: 'resim_url' },
          ]}
          customColumns={[
            {
              label: 'En Ucuz Rakip',
              render: (item) => item.en_ucuz_rakip || '-'
            },
            {
              label: 'Eski Rakip',
              className: 'text-right',
              render: (item) => `${parseFloat(item.eski_rakip_fiyati || 0).toFixed(2)} TL`
            },
            {
              label: 'Yeni Rakip',
              className: 'text-right',
              render: (item) => `${parseFloat(item.yeni_rakip_fiyati || 0).toFixed(2)} TL`
            },
            {
              label: 'Bizim Fiyat',
              className: 'text-right',
              render: (item) => `${parseFloat(item.bizim_fiyat || 0).toFixed(2)} TL`
            }
          ]}
          extraColLabel="Düşüş (%)"
          renderExtra={(item) => `%${parseFloat(item.dusus_yuzdesi || 0).toFixed(1)}`}
        />
        </div>
      </div>

    </div>
  );
}

function AlertTableCard({
  title,
  data,
  extraColLabel,
  renderExtra,
  customColumns = [],
  exportColumns = [],
  exportFileName = 'uyari_listesi',
  headerActions = null,
  emptyStateText = 'Veri bulunamadı'
}) {
  const allRows = Array.isArray(data) ? data : [];
  const rows = allRows.slice(0, 10);
  const shownCount = rows.length;
  const totalCount = allRows.length;

  const handleExport = () => {
    exportRowsToExcelCsv({
      rows: allRows,
      columns: exportColumns,
      fileName: exportFileName
    });
  };

  return (
    <div className="panel p-4 flex flex-col h-80">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {title}
          </h3>
          <span className="shrink-0 inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
            {shownCount} / {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            onClick={handleExport}
            disabled={allRows.length === 0}
          >
            <FileSpreadsheet size={14} />
            Excel&apos;e Aktar
          </button>
        </div>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs uppercase bg-gray-50 text-gray-500 sticky top-0">
            <tr>
              <th className="py-2 px-2 border-b">Fotoğraf</th>
              <th className="py-2 px-2 border-b">Stok Kodu</th>
              <th className="py-2 px-2 border-b">Marka</th>
              {customColumns.map((col) => (
                <th key={col.label} className={`py-2 px-2 border-b ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
              <th className="py-2 px-2 border-b text-right">{extraColLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((item, i) => (
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
                {customColumns.map((col) => (
                  <td key={`${col.label}-${i}`} className={`py-2 px-2 ${col.className || ''}`}>
                    {col.render(item)}
                  </td>
                ))}
                <td className="py-2 px-2 text-right font-medium text-gray-800">
                  {renderExtra(item)}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4 + customColumns.length} className="text-center py-6 text-gray-400">{emptyStateText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

