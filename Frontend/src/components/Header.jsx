import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Home, LogIn, Menu, X } from 'lucide-react';
import './Header.css';
import { useAuth } from '../context/AuthContext';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };
  const getInitials = (u) => {
    const source = (u?.name || u?.email || '').trim();
    if (!source) return '?';
    const parts = source.split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return (first + last).toUpperCase();
  };
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <Video className="logo-icon" size={28} strokeWidth={2.5} />
          <span className="logo-text">Vynce</span>
        </Link>
        <button className="mobile-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className="nav">
          <Link to="/" className="nav-link">
            <Home size={18} />
            <span>Home</span>
          </Link>
          <Link to="/meeting/demo" className="nav-link">
            <LogIn size={18} />
            <span>Join Demo</span>
          </Link>
        </nav>
        <div className="auth-buttons">
          {user ? (
            <>
              {user.photoURL ? (
                <img
                  className="avatar"
                  src={user.photoURL}
                  alt={user.name || 'User'}
                  style={{ width: 30, height: 30 }}
                />
              ) : (
                <span
                  className="avatar avatar-initials"
                  style={{ width: 24, height: 24, lineHeight: '24px' }}
                >
                  {getInitials(user)}
                </span>
              )}
              <button className="btn btn-outline btn-compact" onClick={onLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn btn-outline" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-compact" to="/register">Sign up</Link>
            </>
          )}
        </div>
        {menuOpen && (
          <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
            <div className="mobile-menu-inner" onClick={(e) => e.stopPropagation()}>
              <nav className="mobile-nav">
                <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                  <Home size={18} />
                  <span>Home</span>
                </Link>
                <Link to="/meeting/demo" className="nav-link" onClick={() => setMenuOpen(false)}>
                  <LogIn size={18} />
                  <span>Join Demo</span>
                </Link>
              </nav>
              <div className="mobile-auth">
                {user ? (
                  <>
                    <div className="mobile-user">
                      {user.photoURL ? (
                        <img className="avatar" src={user.photoURL} alt={user.name || 'User'} style={{ width: 30, height: 30 }} />
                      ) : (
                        <span className="avatar avatar-initials" style={{ width: 24, height: 24, lineHeight: '24px' }}>{getInitials(user)}</span>
                      )}
                      <span className="mobile-user-name">{user.name}</span>
                    </div>
                    <button className="btn btn-outline btn-compact" onClick={onLogout}>Logout</button>
                  </>
                ) : (
                  <>
                    <Link className="btn btn-outline btn-compact" to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
                    <Link className="btn btn-primary btn-compact" to="/register" onClick={() => setMenuOpen(false)}>Sign up</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
