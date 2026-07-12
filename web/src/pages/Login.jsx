import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
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

        <form onSubmit={handleSubmit}>
          <div className="field mb-16" style={{ width: '100%' }}>
            <label>E-mail</label>
            <input
              className="input w-full"
              type="email"
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
              required
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <div className="login-hint">
          Usuário de exemplo: rafael.almeida@usinacacu.com.br · senha Usina@123
        </div>
      </div>
    </div>
  );
}
