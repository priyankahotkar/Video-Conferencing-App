import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, LogIn, Home, ThumbsUp, ThumbsDown } from 'lucide-react';
import './CallEnded.css';

function CallEnded() {
  const navigate = useNavigate();
  const location = useLocation();
  const meetingId = location.state?.meetingId || 'Unknown';

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleRejoin = () => {
    navigate(`/meeting/${meetingId}`);
  };

  return (
    <div className="call-ended-page">
      <div className="call-ended-container">
        <div className="status-icon-wrapper">
          <div className="status-icon success">
            <CheckCircle size={64} strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="call-ended-title">Call Ended</h1>
        <p className="call-ended-message">
          You have successfully left the meeting.
        </p>
        <div className="meeting-summary">
          <div className="summary-item">
            <span className="summary-label">Meeting ID:</span>
            <span className="summary-value">{meetingId}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Duration:</span>
            <span className="summary-value">15 minutes</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Participants:</span>
            <span className="summary-value">3 people</span>
          </div>
        </div>
        <div className="feedback-section">
          <h3 className="feedback-title">How was your call quality?</h3>
          <div className="feedback-buttons">
            <button className="feedback-btn">
              <ThumbsUp size={24} />
              <span>Great</span>
            </button>
            <button className="feedback-btn">
              <ThumbsUp size={24} opacity={0.6} />
              <span>Good</span>
            </button>
            <button className="feedback-btn">
              <ThumbsDown size={24} />
              <span>Poor</span>
            </button>
          </div>
        </div>
        <div className="action-buttons">
          <button className="btn btn-secondary" onClick={handleRejoin}>
            <LogIn size={20} />
            Rejoin Meeting
          </button>
          <button className="btn btn-primary" onClick={handleReturnHome}>
            <Home size={20} />
            Return to Home
          </button>
        </div>
        <div className="call-ended-footer">
          <p className="footer-text">
            Need help? Visit our <a href="#support" className="support-link">Support Center</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CallEnded;
