import { useAuth } from '../context/AuthContext.jsx';
import { useEmpresa } from '../context/EmpresaContext.jsx';
import { Icon } from '../components/Icons.jsx';

export function SelecionarEmpresa() {
  const { usuario, logout } = useAuth();
  const { empresas, setEmpresaAtual } = useEmpresa();

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div className="login-logo">
          <img src="/logo-cacu.png" alt="Usina Caçu" className="sidebar-brand-mark" style={{ width: 64, height: 64 }} />
          <div style={{ textAlign: 'center' }}>
            <div className="company" style={{ fontSize: 15 }}>USINA CAÇU</div>
            <div className="product">Selecione a empresa</div>
          </div>
        </div>

        <p className="text-secondary" style={{ fontSize: 13, textAlign: 'center', marginBottom: 18 }}>
          Olá, {usuario?.nome?.split(' ')[0]}. Você tem acesso a mais de uma empresa — escolha com qual deseja trabalhar agora.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {empresas.map((e) => (
            <button
              key={e.id}
              type="button"
              className="btn btn-primary w-full"
              style={{ justifyContent: 'space-between', padding: '14px 16px' }}
              onClick={() => setEmpresaAtual(e.slug)}
            >
              <span>{e.nome}</span>
              <Icon name="chevronRight" size={16} />
            </button>
          ))}
        </div>

        <button className="btn w-full" style={{ justifyContent: 'center', marginTop: 18 }} onClick={logout}>
          Sair
        </button>
      </div>
    </div>
  );
}
