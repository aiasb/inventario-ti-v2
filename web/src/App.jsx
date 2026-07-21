import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useEmpresa } from './context/EmpresaContext.jsx';
import { HeaderProvider } from './context/HeaderContext.jsx';
import { CommandPaletteProvider } from './components/CommandPalette.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { Header } from './components/Header.jsx';
import { Login } from './pages/Login.jsx';
import { SelecionarEmpresa } from './pages/SelecionarEmpresa.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Inventario } from './pages/Inventario.jsx';
import { Manutencoes } from './pages/Manutencoes.jsx';
import { Termos } from './pages/Termos.jsx';
import { Responsaveis } from './pages/Responsaveis.jsx';
import { Acessos } from './pages/Acessos.jsx';
import { Cadastros } from './pages/Cadastros.jsx';
import { Configuracoes } from './pages/Configuracoes.jsx';
import { Radios } from './pages/Radios.jsx';
import { ManutencoesRadios } from './pages/ManutencoesRadios.jsx';
import { ResponsaveisGeo } from './pages/ResponsaveisGeo.jsx';
import { CadastrosGeo } from './pages/CadastrosGeo.jsx';
import { RelatoriosGeo } from './pages/RelatoriosGeo.jsx';

function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  const { precisaEscolher } = useEmpresa();
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
  if (precisaEscolher) {
    return <SelecionarEmpresa />;
  }
  return children;
}

function ModuleRoute({ modulo, empresa, children }) {
  const { usuario } = useAuth();
  const { empresaAtual } = useEmpresa();
  const modulos = Array.isArray(modulo) ? modulo : [modulo];
  const podeVer = !usuario?.permissoes || modulos.some((m) => usuario.permissoes[m]?.podeVer !== false);
  if (!podeVer) return <Navigate to="/" replace />;
  // "empresa" restringe rotas específicas de TI/Geotecnologia à empresa
  // atualmente selecionada — módulos globais (dashboard, acessos,
  // configuracoes) não informam esse parâmetro e ficam sempre acessíveis.
  if (empresa && empresaAtual !== empresa) return <Navigate to="/" replace />;
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
                <Route path="/inventario" element={<ModuleRoute modulo="inventario" empresa="ti"><Inventario /></ModuleRoute>} />
                <Route path="/manutencoes" element={<ModuleRoute modulo="manutencoes" empresa="ti"><Manutencoes /></ModuleRoute>} />
                <Route path="/termos" element={<ModuleRoute modulo="termos" empresa="ti"><Termos /></ModuleRoute>} />
                <Route path="/responsaveis" element={<ModuleRoute modulo="responsaveis" empresa="ti"><Responsaveis /></ModuleRoute>} />
                <Route path="/cadastros" element={<ModuleRoute modulo="cadastros" empresa="ti"><Cadastros /></ModuleRoute>} />
                <Route path="/radios" element={<ModuleRoute modulo="radios" empresa="geotecnologia"><Radios /></ModuleRoute>} />
                <Route path="/manutencoes-radios" element={<ModuleRoute modulo="manutencoesRadios" empresa="geotecnologia"><ManutencoesRadios /></ModuleRoute>} />
                <Route path="/responsaveis-geo" element={<ModuleRoute modulo="responsaveisGeo" empresa="geotecnologia"><ResponsaveisGeo /></ModuleRoute>} />
                <Route path="/cadastros-geo" element={<ModuleRoute modulo="cadastrosGeo" empresa="geotecnologia"><CadastrosGeo /></ModuleRoute>} />
                <Route path="/relatorios-geo" element={<ModuleRoute modulo={['radios', 'manutencoesRadios']} empresa="geotecnologia"><RelatoriosGeo /></ModuleRoute>} />
                <Route path="/acessos" element={<ModuleRoute modulo="acessos"><Acessos /></ModuleRoute>} />
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
