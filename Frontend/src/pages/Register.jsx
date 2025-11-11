import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <UserPlus size={22} style={{ color: '#1a73e8' }}/>
          <h2 className="auth-title" style={{ color: '#1a73e8' }}>Create your account</h2>
        </div>
        <p className="auth-subtitle">Join Vynce to start hosting and joining meetings</p>
        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-input-group">
            <User size={16} className="auth-input-icon" />
            <input className="auth-input with-icon" type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
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
          <div className="auth-actions">
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
          </div>
        </form>
        {/* <div className="auth-divider">or</div>
        <div className="auth-socials">
          <button className="auth-social-btn" type="button"><img src="/favicon.svg" alt="" width="16" height="16" /> Continue</button>
          <button className="auth-social-btn" type="button"><img src="/vite.svg" alt="" width="16" height="16" /> Continue</button>
        </div> */}
        <div className="auth-alt">Have an account? <Link to="/login">Sign in</Link></div>
      </div>
    </div>
  );
}


