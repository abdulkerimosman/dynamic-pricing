import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login() {
  const [eposta, setEposta]     = useState('');
  const [sifre, setSifre]       = useState('');
  const [goster, setGoster]     = useState(false);
  const [hata, setHata]         = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');
    setYukleniyor(true);
    try {
      const { data } = await api.post('/auth/giris', { eposta, sifre });
      login(data.token, data.kullanici);
      navigate('/');
    } catch (err) {
      setHata(err.response?.data?.error ?? 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200 mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sporthink</h1>
          <p className="text-slate-500 text-sm mt-1">Dinamik Fiyatlama Sistemi</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Sisteme Giriş Yap</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                placeholder="ornek@sporthink.com.tr"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={goster ? 'text' : 'password'}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setGoster(!goster)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {goster ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {hata && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {hata}
              </div>
            )}

            <button type="submit" disabled={yukleniyor} className="btn-primary w-full justify-center py-2.5">
              {yukleniyor ? <Loader2 size={16} className="animate-spin" /> : null}
              {yukleniyor ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <p className="text-xs text-slate-400 text-center font-medium">Demo Giriş</p>
            <p className="text-xs text-slate-400 text-center">ahmet@sporthink.com.tr</p>
            <p className="text-xs text-slate-400 text-center">Şifre: <code className="bg-slate-100 px-1 rounded">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
