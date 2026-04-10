import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Tag, CalendarRange,
  Package, Settings,
} from 'lucide-react';
import clsx from 'clsx';

const NAV_ITEMS = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/urunler',     icon: Tag,             label: 'Ürün Fiyat Analizi' },
  { to: '/kampanya',    icon: CalendarRange,   label: 'Kampanya Planlama' },
  { to: '/stok',        icon: Package,         label: 'Stok & Talep' },
  { to: '/ayarlar',     icon: Settings,        label: 'Ayarlar & Import' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">S</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-none">Sporthink</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Fiyatlama Sistemi</p>
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
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
        v1.0.0 — {new Date().getFullYear()}
      </div>
    </aside>
  );
}
