import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogIn, Zap, Lock, Users, Smartphone, Mic, MessageSquare } from 'lucide-react';
import './LandingPage.css';

function LandingPage() {
  const [meetingCode, setMeetingCode] = useState('');
  const navigate = useNavigate();

  const handleCreateMeeting = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    navigate(`/meeting/${randomCode}`);
  };

  const handleJoinMeeting = (e) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/meeting/${meetingCode.trim()}`);
    }
  };

  return (
    <div className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Connect Face-to-Face, Anywhere</h1>
          <p className="hero-subtitle">
            Premium video conferencing for teams and individuals.
            Crystal-clear quality, secure connections, and seamless collaboration.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={handleCreateMeeting}>
              <Plus size={20} strokeWidth={3} />
              Create New Meeting
            </button>
            <form className="join-form" onSubmit={handleJoinMeeting}>
              <input
                type="text"
                placeholder="Enter meeting code"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                className="join-input"
              />
              <button type="submit" className="btn btn-secondary">
                <LogIn size={18} />
                Join Meeting
              </button>
            </form>
          </div>
        </div>
        <div className="hero-image">
          <div className="video-preview">
            <div className="video-placeholder">
              <MessageSquare size={60} strokeWidth={1.5} opacity={0.8} />
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Why Choose VideoMeet?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Zap className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">HD Video Quality</h3>
            <p className="feature-description">
              Experience crystal-clear video up to 1080p resolution with advanced compression technology.
            </p>
          </div>
          <div className="feature-card">
            <Lock className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">End-to-End Encryption</h3>
            <p className="feature-description">
              Your conversations stay private with military-grade encryption and secure connections.
            </p>
          </div>
          <div className="feature-card">
            <Users className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">Up to 100 Participants</h3>
            <p className="feature-description">
              Host large meetings, webinars, and virtual events with ease and reliability.
            </p>
          </div>
          <div className="feature-card">
            <Smartphone className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">Cross-Platform</h3>
            <p className="feature-description">
              Join from any device - desktop, mobile, or tablet. Works on all major browsers.
            </p>
          </div>
          <div className="feature-card">
            <Mic className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">Noise Cancellation</h3>
            <p className="feature-description">
              AI-powered noise suppression ensures clear audio even in noisy environments.
            </p>
          </div>
          <div className="feature-card">
            <MessageSquare className="feature-icon" size={40} strokeWidth={1.5} />
            <h3 className="feature-title">Real-time Chat</h3>
            <p className="feature-description">
              Share messages, files, and links during your meeting with integrated chat.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Get Started?</h2>
          <p className="cta-description">
            Create your first meeting in seconds. No download or signup required.
          </p>
          <button className="btn btn-primary btn-large" onClick={handleCreateMeeting}>
            <Plus size={22} strokeWidth={3} />
            Start Meeting Now
          </button>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
