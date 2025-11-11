import { Shield, MessageSquare, Users, BookOpen, Github, Linkedin, Twitter } from 'lucide-react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">Vynce</h3>
          <p className="footer-description">
            Connect with anyone, anywhere. Premium video conferencing made simple.
          </p>
          <div className="social-links">
            <a href="#github" className="social-icon" title="GitHub">
              <Github size={20} />
            </a>
            <a href="#linkedin" className="social-icon" title="LinkedIn">
              <Linkedin size={20} />
            </a>
            <a href="#twitter" className="social-icon" title="Twitter">
              <Twitter size={20} />
            </a>
          </div>
        </div>
        <div className="footer-section">
          <h4 className="footer-heading">Product</h4>
          <ul className="footer-links">
            <li><a href="#features"><MessageSquare size={16} /> Features</a></li>
            <li><a href="#pricing"><Shield size={16} /> Security</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4 className="footer-heading">Company</h4>
          <ul className="footer-links">
            <li><a href="#about"><Users size={16} /> About Us</a></li>
            <li><a href="#contact"><MessageSquare size={16} /> Contact</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4 className="footer-heading">Support</h4>
          <ul className="footer-links">
            <li><a href="#help"><BookOpen size={16} /> Help Center</a></li>
            <li><a href="#docs"><BookOpen size={16} /> Documentation</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} Vynce. All rights reserved.</p>
        <div className="footer-legal">
          <a href="#privacy">Privacy Policy</a>
          <span className="separator">|</span>
          <a href="#terms">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
