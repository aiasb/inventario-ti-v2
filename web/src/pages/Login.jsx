import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
      if (lembrar && window.PasswordCredential) {
        try {
          const cred = new window.PasswordCredential({ id: email, password: senha, name: email });
          await navigator.credentials.store(cred);
        } catch {
          // Credential Management API é opcional (Chrome/Edge) — o navegador
          // ainda pode oferecer salvar a senha pelo próprio prompt nativo do form.
        }
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
