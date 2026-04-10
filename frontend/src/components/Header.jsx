import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export default function Header() {
  const { kullanici, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/giris');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
            <User size={14} className="text-slate-500" />
          </div>
          <span className="font-medium">{kullanici?.ad_soyad ?? 'Kullanıcı'}</span>
          {kullanici?.roller?.[0] && (
            <span className="badge-slate">{kullanici.roller[0]}</span>
          )}
        </div>
        <button onClick={handleLogout} className="btn-ghost text-slate-500 hover:text-red-600">
          <LogOut size={16} />
          Çıkış
        </button>
      </div>
    </header>
  );
}
