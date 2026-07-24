import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const LEMBRAR_KEY = 'inventario_lembrar_credenciais';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Preenche e-mail/senha lembrados de um login anterior (ver handleSubmit —
  // salvos aqui porque a antiga integração com navigator.credentials.store()
  // (Credential Management API) parou de funcionar: o Chrome removeu
  // PasswordCredential e Firefox/Safari nunca a implementaram.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LEMBRAR_KEY) || 'null');
      if (saved?.email) {
        setEmail(saved.email);
        setSenha(saved.senha || '');
      }
    } catch {
      // dado corrompido — ignora e segue com os campos vazios.
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
      if (lembrar) {
        localStorage.setItem(LEMBRAR_KEY, JSON.stringify({ email, senha }));
      } else {
        localStorage.removeItem(LEMBRAR_KEY);
      }
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/logo-cacu.png"
            alt="Usina Caçu"
            className="sidebar-brand-mark"
            style={{ width: 64, height: 64 }}
          />
          <div style={{ textAlign: 'center' }}>
            <div className="company" style={{ fontSize: 15 }}>USINA CAÇU</div>
            <div className="product">Inventário TI</div>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="field mb-16" style={{ width: '100%' }}>
            <label>E-mail</label>
            <input
              className="input w-full"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="nome@usinacacu.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field mb-16" style={{ width: '100%' }}>
            <label>Senha</label>
            <input
              className="input w-full"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-8 mb-16" style={{ fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="checkbox"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
            />
            Lembrar minhas credenciais
          </label>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
