import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Tag, CalendarRange,
  Package, Settings, Upload, Database,
} from 'lucide-react';
import clsx from 'clsx';
import BrandLogo from './BrandLogo';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/urunler',     icon: Tag,             label: 'Ürün Fiyat Analizi' },
  { to: '/kampanya',    icon: CalendarRange,   label: 'Kampanya Planlama' },
  { to: '/stok',        icon: Package,         label: 'Stok & Talep' },
  { to: '/master-veriler', icon: Database,     label: 'Master Veri Yonetimi' },
  { to: '/importlar',   icon: Upload,          label: 'Importlar' },
  { to: '/ayarlar',     icon: Settings,        label: 'Ayarlar' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-200">
        <BrandLogo size="sm" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-none">Sporthink</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Fiyatlama Sistemi</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-100 text-brand-500 border-l-2 border-brand-500'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500">
        v1.0.0 — {new Date().getFullYear()}
      </div>
    </aside>
  );
}

