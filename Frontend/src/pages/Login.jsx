import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <LogIn size={22} style={{ color: '#1a73e8' }}/>
          <h2 className="auth-title" style={{ color: '#1a73e8' }}>Welcome back</h2>
        </div>
        <p className="auth-subtitle">Sign in to continue to Vynce</p>
        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-input-group">
            <Mail size={16} className="auth-input-icon" />
            <input className="auth-input with-icon" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="auth-input-group">
            <Lock size={16} className="auth-input-icon" />
            <input className="auth-input with-icon" type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="auth-input-trailing" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="auth-helpers">
            <label className="auth-remember"  style={{ color: 'gray' }}>
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="auth-actions">
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </div>
        </form>
        {/* <div className="auth-divider">or</div>
        <div className="auth-socials">
          <button className="auth-social-btn" type="button"><img src="/favicon.svg" alt="" width="16" height="16" /> Continue</button>
          <button className="auth-social-btn" type="button"><img src="/vite.svg" alt="" width="16" height="16" /> Continue</button>
        </div> */}
        <div className="auth-alt">No account? <Link to="/register">Create one</Link></div>
      </div>
    </div>
  );
}


