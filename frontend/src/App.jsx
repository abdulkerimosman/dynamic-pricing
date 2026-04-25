import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UrunFiyatAnalizi from './pages/UrunFiyatAnalizi';
import Alertler from './pages/Alertler';
import Kampanyalar from './pages/Kampanyalar';
import Stok from './pages/Stok';
import Rakipler from './pages/Rakipler';
import Ayarlar from './pages/Ayarlar';
import KampanyaPlanlama from './pages/KampanyaPlanlama';
import Importlar from './pages/Importlar';
import MasterVeriler from './pages/MasterVeriler';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/giris" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/giris" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="urunler"    element={<UrunFiyatAnalizi />} />
          <Route path="alertler"   element={<Alertler />} />
          <Route path="kampanyalar"element={<Kampanyalar />} />
          <Route path="stok" element={<Stok />} />
          <Route path="kampanya" element={<KampanyaPlanlama />} />
          <Route path="rakipler" element={<Rakipler />} />
          <Route path="master-veriler" element={<MasterVeriler />} />
          <Route path="ayarlar"    element={<Ayarlar />} />
          <Route path="importlar" element={<Importlar />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
