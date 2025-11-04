import { Link } from 'react-router-dom';
import { Video, Home, LogIn } from 'lucide-react';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <Video className="logo-icon" size={28} strokeWidth={2.5} />
          <span className="logo-text">VideoMeet</span>
        </Link>
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
      </div>
    </header>
  );
}

export default Header;
