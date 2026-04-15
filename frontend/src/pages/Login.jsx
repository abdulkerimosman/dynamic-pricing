import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../api';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <BrandLogo size="md" showWordmark className="flex-col gap-4" />
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sisteme Giriş Yap</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                value={eposta}
                onChange={(e) => setEposta(e.target.value)}
                placeholder="ornek@sporthink.com.tr"
                required
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={goster ? 'text' : 'password'}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setGoster(!goster)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-1">
            <p className="text-xs text-gray-500 text-center font-medium">Demo Giriş</p>
            <p className="text-xs text-gray-500 text-center">ahmet@sporthink.com.tr</p>
            <p className="text-xs text-gray-500 text-center">Şifre: <code className="bg-gray-100 px-1 rounded">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}

