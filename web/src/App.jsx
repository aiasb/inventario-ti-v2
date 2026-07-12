import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { HeaderProvider } from './context/HeaderContext.jsx';
import { CommandPaletteProvider } from './components/CommandPalette.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Inventario } from './pages/Inventario.jsx';
import { Manutencoes } from './pages/Manutencoes.jsx';
import { Termos } from './pages/Termos.jsx';
import { Responsaveis } from './pages/Responsaveis.jsx';
import { Acessos } from './pages/Acessos.jsx';
import { Cadastros } from './pages/Cadastros.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';

function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="login-screen">
        <div className="spinner" />
      </div>
    );
  }
  if (!usuario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function ModuleRoute({ modulo, children }) {
  const { usuario } = useAuth();
  const podeVer = !usuario?.permissoes || usuario.permissoes[modulo]?.podeVer !== false;
  if (!podeVer) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <HeaderProvider>
      <CommandPaletteProvider>
        <div className="app-shell">
          <Sidebar />
          <div className="main-area">
            <Header />
            <div className="page-content">{children}</div>
          </div>
        </div>
      </CommandPaletteProvider>
    </HeaderProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventario" element={<ModuleRoute modulo="inventario"><Inventario /></ModuleRoute>} />
                <Route path="/manutencoes" element={<ModuleRoute modulo="manutencoes"><Manutencoes /></ModuleRoute>} />
                <Route path="/termos" element={<ModuleRoute modulo="termos"><Termos /></ModuleRoute>} />
                <Route path="/responsaveis" element={<ModuleRoute modulo="responsaveis"><Responsaveis /></ModuleRoute>} />
                <Route path="/acessos" element={<ModuleRoute modulo="acessos"><Acessos /></ModuleRoute>} />
                <Route path="/cadastros" element={<ModuleRoute modulo="cadastros"><Cadastros /></ModuleRoute>} />
                <Route path="/configuracoes" element={<ModuleRoute modulo="configuracoes"><Configuracoes /></ModuleRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
