import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, MessageSquare, Users, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Send, X } from 'lucide-react';
import './MeetingRoom.css';

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [participants] = useState([
    { id: 1, name: 'You', isMuted: isMuted, isVideoOff: isVideoOff },
    { id: 2, name: 'John Doe', isMuted: false, isVideoOff: false },
    { id: 3, name: 'Jane Smith', isMuted: true, isVideoOff: false },
  ]);

  useEffect(() => {
    document.title = `Meeting: ${meetingId}`;
    return () => {
      document.title = 'VideoMeet';
    };
  }, [meetingId]);

  const handleLeaveMeeting = () => {
    navigate('/call-ended', { state: { meetingId } });
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      setChatMessages([...chatMessages, {
        id: Date.now(),
        sender: 'You',
        message: chatMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setChatMessage('');
    }
  };

  return (
    <div className="meeting-room">
      <div className="meeting-header">
        <div className="meeting-info">
          <h2 className="meeting-title">Meeting: {meetingId}</h2>
          <span className="meeting-time">12:34 PM</span>
        </div>
        <button className="copy-link-btn">
          <Copy size={18} />
          Copy Link
        </button>
      </div>

      <div className="meeting-content">
        <div className="video-grid-container">
          <div className={`video-grid ${participants.length <= 2 ? 'grid-1-2' : participants.length <= 4 ? 'grid-2-2' : 'grid-3-3'}`}>
            {participants.map((participant) => (
              <div key={participant.id} className="video-tile">
                <div className="video-placeholder">
                  {participant.isVideoOff ? (
                    <div className="avatar">
                      <span className="avatar-text">{participant.name.charAt(0)}</span>
                    </div>
                  ) : (
                    <div className="video-active">
                      <Video size={50} strokeWidth={1.5} opacity={0.8} />
                    </div>
                  )}
                </div>
                <div className="video-info">
                  <span className="participant-name">{participant.name}</span>
                  {participant.isMuted && <MicOff size={16} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showChat && (
          <div className="side-panel chat-panel">
            <div className="panel-header">
              <h3>Chat</h3>
              <button className="close-panel" onClick={() => setShowChat(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="empty-state">No messages yet. Start the conversation!</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="chat-message">
                    <div className="message-header">
                      <span className="message-sender">{msg.sender}</span>
                      <span className="message-time">{msg.timestamp}</span>
                    </div>
                    <p className="message-text">{msg.message}</p>
                  </div>
                ))
              )}
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="chat-input"
              />
              <button type="submit" className="send-btn">
                <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {showParticipants && (
          <div className="side-panel participants-panel">
            <div className="panel-header">
              <h3>Participants ({participants.length})</h3>
              <button className="close-panel" onClick={() => setShowParticipants(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="participants-list">
              {participants.map((participant) => (
                <div key={participant.id} className="participant-item">
                  <div className="participant-avatar">
                    {participant.name.charAt(0)}
                  </div>
                  <span className="participant-item-name">{participant.name}</span>
                  <div className="participant-status">
                    {participant.isMuted && <MicOff size={16} />}
                    {participant.isVideoOff && <VideoOff size={16} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="meeting-controls">
        <div className="controls-left">
          <span className="meeting-id-badge">ID: {meetingId}</span>
        </div>
        <div className="controls-center">
          <button
            className={`control-btn ${isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <button
            className={`control-btn ${isVideoOff ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title="Share screen"
          >
            <Monitor size={24} />
          </button>
          <button
            className="control-btn leave-btn"
            onClick={handleLeaveMeeting}
            title="Leave meeting"
          >
            <PhoneOff size={24} />
          </button>
        </div>
        <div className="controls-right">
          <button
            className={`control-btn ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Chat"
          >
            <MessageSquare size={24} />
          </button>
          <button
            className={`control-btn ${showParticipants ? 'active' : ''}`}
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants"
          >
            <Users size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MeetingRoom;
