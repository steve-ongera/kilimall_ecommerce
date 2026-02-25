import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--kl-orange)' }}>kili<span style={{ color: 'var(--kl-dark)' }}>mall</span></span>
        </div>
        <h1 className="auth-title">Welcome Back!</h1>

        {error && (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--kl-red)', marginBottom: 16 }}>
            <i className="bi bi-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-control" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">
              Password
              <a href="#" style={{ float: 'right', fontSize: 12, color: 'var(--kl-orange)', fontWeight: 400 }}>Forgot Password?</a>
            </label>
            <input className="form-control" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : <><i className="bi bi-box-arrow-in-right"></i> Sign In</>}
          </button>
        </form>

        <div className="auth-divider">— or continue with —</div>

        <div style={{ display: 'flex', gap: 12 }}>
          {[{ icon: 'bi-google', label: 'Google', color: '#ea4335' }, { icon: 'bi-facebook', label: 'Facebook', color: '#1877f2' }].map(s => (
            <button key={s.label} style={{ flex: 1, border: '1px solid var(--kl-border)', background: 'none', padding: '10px', borderRadius: 4, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color }}></i> {s.label}
            </button>
          ))}
        </div>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', first_name: '', last_name: '', phone: '', password: '', password2: '' });
  const [error, setError] = useState({});
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data || {});
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    [{ key: 'first_name', label: 'First Name', type: 'text', ph: 'John' }, { key: 'last_name', label: 'Last Name', type: 'text', ph: 'Doe' }],
    [{ key: 'email', label: 'Email Address', type: 'email', ph: 'you@example.com' }, { key: 'phone', label: 'Phone (M-Pesa)', type: 'tel', ph: '0712 345 678' }],
    [{ key: 'username', label: 'Username', type: 'text', ph: 'johndoe' }],
    [{ key: 'password', label: 'Password', type: 'password', ph: '••••••••' }, { key: 'password2', label: 'Confirm Password', type: 'password', ph: '••••••••' }],
  ];

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--kl-orange)' }}>kili<span style={{ color: 'var(--kl-dark)' }}>mall</span></span>
        </div>
        <h1 className="auth-title">Create Account</h1>

        {error.non_field_errors && (
          <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: 'var(--kl-red)', marginBottom: 16 }}>
            {error.non_field_errors[0]}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {fields.map((row, i) => (
            <div key={i} className={row.length > 1 ? 'form-row' : ''}>
              {row.map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <input className="form-control" type={f.type} placeholder={f.ph}
                    value={form[f.key]} onChange={update(f.key)} required />
                  {error[f.key] && <div className="form-error">{error[f.key][0]}</div>}
                </div>
              ))}
            </div>
          ))}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : <><i className="bi bi-person-check"></i> Create Account</>}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}