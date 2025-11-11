import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Copy,
  MessageSquare,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Send,
  X,
  EllipsisVertical,
} from "lucide-react";
import "./MeetingRoom.css";
import { createSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> { pc, videoEl, name, isMuted, isVideoOff }
  const [remotePeers, setRemotePeers] = useState([]); // [{socketId, name, isMuted, isVideoOff}]
  const [toasts, setToasts] = useState([]);
  const [remotePresenterId, setRemotePresenterId] = useState(null);
  const [remotePresenterName, setRemotePresenterName] = useState("");
  const [focusedSocketId, setFocusedSocketId] = useState(null); // 'self' or socketId
  const meetingStartRef = useRef(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [audioOutputName, setAudioOutputName] = useState("Default Output");
  const [audioOutputDeviceId, setAudioOutputDeviceId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const showChatRef = useRef(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isOptionOpen, setIsOptionOpen] = useState(false);

  const participants = useMemo(() => {
    const list = [
      {
        id: "self",
        name: user?.name || "You",
        isMuted,
        isVideoOff,
        isSelf: true,
      },
    ];
    remotePeers.forEach(({ socketId }) => {
      const entry = peersRef.current.get(socketId) || {};
      list.push({
        id: socketId,
        name: entry.name || "Peer",
        isMuted: entry.isMuted ?? false,
        isVideoOff: entry.isVideoOff ?? false,
        isSelf: false,
      });
    });
    return list;
  }, [user, isMuted, isVideoOff, remotePeers]);

  const getInitials = (name) => {
    const src = (name || "").trim();
    if (!src) return "?";
    const parts = src.split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase();
  };

  const rtcConfig = {
    iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  };

  const addLocalTracks = (pc) => {
    if (!localStreamRef.current) return;
    localStreamRef.current
      .getTracks()
      .forEach((track) => pc.addTrack(track, localStreamRef.current));
  };

  const getPeerName = (socketId) =>
    (peersRef.current.get(socketId) && peersRef.current.get(socketId).name) ||
    "Peer";

  // update audio output device label (listening device)
  const updateAudioDeviceName = async () => {
    try {
      if (!navigator.mediaDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      // prefer an explicit audiooutput if available, otherwise default
      const out = devices.find((d) => d.kind === "audiooutput");
      setAudioOutputDeviceId(out?.deviceId || null);
      setAudioOutputName(out?.label || "Default Output");

      // apply sinkId to any video elements that support setSinkId (route audio)
      if (out?.deviceId) {
        peersRef.current.forEach((entry) => {
          try {
            const el = entry.videoEl;
            if (el && typeof el.setSinkId === "function") {
              el.setSinkId(out.deviceId).catch(() => {});
            }
          } catch (e) {}
        });
        // local video is muted so no sink needed, but try to set for completeness
        try {
          if (
            localVideoRef.current &&
            typeof localVideoRef.current.setSinkId === "function"
          ) {
            localVideoRef.current.setSinkId(out.deviceId).catch(() => {});
          }
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  };
  const createPeer = (remoteSocketId) => {
    const pc = new RTCPeerConnection(rtcConfig);
    addLocalTracks(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          meetingId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      let entry = peersRef.current.get(remoteSocketId);
      if (!entry) return;
      if (entry.videoEl) {
        entry.videoEl.srcObject = stream;
      }
    };

    const existing = peersRef.current.get(remoteSocketId) || {};
    peersRef.current.set(remoteSocketId, {
      ...existing,
      pc,
      videoEl: existing.videoEl || null,
    });
    setRemotePeers((prev) => {
      const map = new Map(prev.map((p) => [p.socketId, p]));
      if (!map.has(remoteSocketId))
        map.set(remoteSocketId, {
          socketId: remoteSocketId,
          name: existing.name || "Peer",
          isMuted: false,
          isVideoOff: false,
        });
      return Array.from(map.values());
    });
    return pc;
  };

  useEffect(() => {
    document.title = `Meeting: ${meetingId}`;

    let isMounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!isMounted) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // update audio output device label now and when devices change
        updateAudioDeviceName();
        try {
          navigator.mediaDevices.addEventListener(
            "devicechange",
            updateAudioDeviceName
          );
        } catch (e) {
          /* some browsers */
        }

        const socket = createSocket(token);
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("join-meeting", {
            meetingId,
          });
        });

        socket.io.on("reconnect_attempt", () => addToast("Reconnecting..."));
        socket.io.on("reconnect", () => addToast("Reconnected"));
        socket.io.on("error", () => addToast("Socket error"));
        socket.on("disconnect", () => addToast("Disconnected"));
        socket.on("connect_error", (err) => {
          const msg =
            err?.message === "Unauthorized"
              ? "Authentication required. Redirecting to login…"
              : "Connection error. Please login again.";
          addToast(msg);
          setTimeout(() => navigate("/login"), 800);
        });

        socket.on("user-joined", async ({ socketId: remoteId, userName }) => {
          // store display name
          const entry = peersRef.current.get(remoteId) || {};
          peersRef.current.set(remoteId, {
            ...entry,
            name: userName || "Peer",
          });
          setRemotePeers((prev) =>
            prev.map((p) =>
              p.socketId === remoteId ? { ...p, name: userName || "Peer" } : p
            )
          );
          const pc = createPeer(remoteId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { meetingId, offer, from: socket.id });
        });

        socket.on("offer", async ({ offer, from }) => {
          let entry = peersRef.current.get(from);
          if (!entry) {
            const pc = createPeer(from);
            entry = peersRef.current.get(from);
          }
          const pc = peersRef.current.get(from).pc;
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { meetingId, answer, from: socket.id });
        });

        socket.on("answer", async ({ answer, from }) => {
          const entry = peersRef.current.get(from);
          if (!entry) return;
          await entry.pc.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        });

        socket.on("ice-candidate", async ({ candidate, from }) => {
          const entry = peersRef.current.get(from);
          if (!entry) return;
          try {
            await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {}
        });

        socket.on("user-left", ({ socketId }) => {
          const entry = peersRef.current.get(socketId);
          if (entry) {
            entry.pc.close();
            peersRef.current.delete(socketId);
            setRemotePeers((prev) =>
              prev.filter((p) => p.socketId !== socketId)
            );
          }
        });

        socket.on("chat-message", ({ message, sender, timestamp, from }) => {
          setChatMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender,
              message,
              timestamp: new Date(timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ]);
          if (!showChatRef.current && from !== socketRef.current?.id) {
            addToast(`${sender}: ${message}`);
          }
        });

        socket.on(
          "media-state",
          ({ userId, isMuted, isVideoOff, from, isScreenSharing }) => {
            const id = from; // optional if backend sends 'from'
            const key = id || Array.from(peersRef.current.keys())[0];
            if (!key) return;
            const entry = peersRef.current.get(key) || {};
            peersRef.current.set(key, { ...entry, isMuted, isVideoOff });
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.socketId === key ? { ...p, isMuted, isVideoOff } : p
              )
            );
            if (typeof isScreenSharing === "boolean") {
              if (isScreenSharing) {
                const name = getPeerName(key);
                setRemotePresenterId(key);
                setRemotePresenterName(name);
                // auto-focus the presenter for better UX
                setFocusedSocketId((curr) => curr || key);
              } else if (remotePresenterId === key) {
                setRemotePresenterId(null);
                setRemotePresenterName("");
              }
            }
          }
        );
      } catch (err) {
        console.error("Media error", err);
        addToast("Could not access camera/microphone");
      }
    };

    start();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit("leave-meeting", {
          meetingId,
          userId: user?._id || "anon",
        });
        socketRef.current.disconnect();
      }
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      try {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          updateAudioDeviceName
        );
      } catch (e) {
        /* ignore */
      }
      document.title = "Vynce";
    };
  }, [meetingId, user]);

  const handleLeaveMeeting = () => {
    const durationMs = Date.now() - (meetingStartRef.current || Date.now());
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const durationLabel = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    const participantsCount = 1 + remotePeers.length;
    navigate("/call-ended", {
      state: {
        meetingId,
        duration: durationLabel,
        participants: participantsCount,
      },
    });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (localStreamRef.current) {
      localStreamRef.current
        .getAudioTracks()
        .forEach((t) => (t.enabled = !next));
    }
    if (socketRef.current) {
      socketRef.current.emit("media-state", {
        meetingId,
        userId: user?._id || "anon",
        isMuted: next,
        isVideoOff,
        from: socketRef.current.id,
      });
    }
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (localStreamRef.current) {
      localStreamRef.current
        .getVideoTracks()
        .forEach((t) => (t.enabled = !next));
    }
    if (socketRef.current) {
      socketRef.current.emit("media-state", {
        meetingId,
        userId: user?._id || "anon",
        isMuted,
        isVideoOff: next,
        from: socketRef.current.id,
      });
    }
  };

  const startScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenTrack = displayStream.getVideoTracks()[0];
      // replace on all senders
      peersRef.current.forEach(({ pc }) => {
        const sender = pc
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });
      if (localVideoRef.current)
        localVideoRef.current.srcObject = displayStream;
      setIsScreenSharing(true);
      if (socketRef.current) {
        socketRef.current.emit("media-state", {
          meetingId,
          userId: user?._id || "anon",
          isMuted,
          isVideoOff,
          isScreenSharing: true,
          from: socketRef.current.id,
        });
      }
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      addToast("Screen share cancelled");
    }
  };

  const stopScreenShare = async () => {
    if (!localStreamRef.current) return;
    const camTrack = localStreamRef.current.getVideoTracks()[0];
    peersRef.current.forEach(({ pc }) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender && camTrack) sender.replaceTrack(camTrack);
    });
    if (localVideoRef.current)
      localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
    if (socketRef.current) {
      socketRef.current.emit("media-state", {
        meetingId,
        userId: user?._id || "anon",
        isMuted,
        isVideoOff,
        isScreenSharing: false,
        from: socketRef.current.id,
      });
    }
  };

  const toggleScreenShare = () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      const payload = {
        meetingId,
        message: chatMessage,
        sender: user?.name || "You",
        userId: user?._id || "anon",
      };
      if (socketRef.current) {
        socketRef.current.emit("chat-message", payload);
      }
      // Do not append locally; rely on server echo to avoid duplicates
      setChatMessage("");
    }
  };

  const addToast = (msg) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000
    );
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/meeting/${meetingId}`;
    const message = `To join the video meeting, click this link: ${url} \n\nOr join manually using Meeting ID: ${meetingId}`;

    try {
      await navigator.clipboard.writeText(message);
      addToast("Invitation message copied");
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      addToast("Invitation message copied");
    }
  };

  useEffect(() => {
    showChatRef.current = showChat;
  }, [showChat]);

  const enterFullscreen = (el) => {
    if (!el) return;
    const anyEl = el;
    if (anyEl.requestFullscreen) anyEl.requestFullscreen();
    else if (anyEl.webkitRequestFullscreen) anyEl.webkitRequestFullscreen();
    else if (anyEl.mozRequestFullScreen) anyEl.mozRequestFullScreen();
    else if (anyEl.msRequestFullscreen) anyEl.msRequestFullscreen();
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
  };

  return (
    <div className="meeting-room">
      <div className="meeting-header">
        <div className="meeting-info">
          <h2 className="meeting-title">Meeting: {meetingId}</h2>
          <span className="meeting-time">12:34 PM</span>
        </div>
        <button
          className="audio-device-btn"
          onClick={() => addToast(`Output: ${audioOutputName}`)}
          title={`Audio output: ${audioOutputName}`}
        >
          <Monitor size={18} />
          <span className="audio-device-name">
            {audioOutputName || "Default Output"}
          </span>
        </button>
        <button
          className="copy-link-btn"
          onClick={handleCopyLink}
          title="Copy meeting link"
        >
          <Copy size={18} />
          Copy Link
        </button>
      </div>

      <div className="meeting-content">
        {isScreenSharing && (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#111827",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: 8,
              zIndex: 5,
            }}
          >
            You are presenting — click Stop to end
          </div>
        )}
        {remotePresenterId && !isScreenSharing && (
          <div
            style={{
              position: "absolute",
              top: 64,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#111827",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: 8,
              zIndex: 5,
            }}
          >
            {remotePresenterName} is presenting — click their tile to enlarge
          </div>
        )}
        <div className="video-grid-container">
          {/* Focused view */}
          {focusedSocketId ? (
            <div style={{ marginBottom: 16 }}>
              <div
                className="video-tile"
                style={{ width: "100%", aspectRatio: "16 / 9" }}
              >
                {focusedSocketId === "self" ? (
                  isVideoOff ? (
                    <div className="video-placeholder">
                      <div className="avatar">
                        <span className="avatar-text">
                          {getInitials(user?.name || "You")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="video-element"
                    />
                  )
                ) : peersRef.current.get(focusedSocketId) &&
                  peersRef.current.get(focusedSocketId).isVideoOff ? (
                  <div className="video-placeholder">
                    <div className="avatar">
                      <span className="avatar-text">
                        {getInitials(getPeerName(focusedSocketId))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={(el) => {
                      const entry = peersRef.current.get(focusedSocketId);
                      if (entry) {
                        entry.videoEl = el;
                        try {
                          if (
                            el &&
                            audioOutputDeviceId &&
                            typeof el.setSinkId === "function"
                          ) {
                            el.setSinkId(audioOutputDeviceId).catch(() => {});
                          }
                        } catch (e) {}
                      }
                    }}
                    autoPlay
                    playsInline
                    className="video-element"
                  />
                )}
                <div className="video-info">
                  <span className="participant-name">
                    {focusedSocketId === "self"
                      ? user?.name || "You"
                      : getPeerName(focusedSocketId)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Grid of tiles (click to focus) */}
          <div
            className={`video-grid ${
              [...remotePeers, { socketId: "self" }].length <= 2
                ? "grid-1-2"
                : remotePeers.length <= 3
                ? "grid-2-2"
                : "grid-3-3"
            }`}
          >
            <div
              className="video-tile"
              key="local"
              onClick={() => {
                setFocusedSocketId("self");
                if (!isVideoOff) enterFullscreen(localVideoRef.current);
              }}
              style={{ cursor: "pointer" }}
            >
              {isVideoOff ? (
                <div className="video-placeholder">
                  <div className="avatar">
                    <span className="avatar-text">
                      {getInitials(user?.name || "You")}
                    </span>
                  </div>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-element"
                />
              )}
              <div className="video-info">
                <span className="participant-name">{user?.name || "You"}</span>
                {isMuted && <MicOff size={16} />}
              </div>
            </div>
            {remotePeers.map(({ socketId }) => (
              <div
                key={socketId}
                className="video-tile"
                onClick={() => {
                  setFocusedSocketId(socketId);
                  const entry = peersRef.current.get(socketId);
                  if (entry && entry.videoEl && !entry.isVideoOff)
                    enterFullscreen(entry.videoEl);
                }}
                style={{ cursor: "pointer" }}
              >
                {peersRef.current.get(socketId) &&
                peersRef.current.get(socketId).isVideoOff ? (
                  <div className="video-placeholder">
                    <div className="avatar">
                      <span className="avatar-text">
                        {getInitials(
                          (peersRef.current.get(socketId) &&
                            peersRef.current.get(socketId).name) ||
                            "Peer"
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={(el) => {
                      const entry = peersRef.current.get(socketId);
                      if (entry) {
                        entry.videoEl = el;
                        // if we already know the preferred output device, apply it
                        try {
                          if (
                            el &&
                            audioOutputDeviceId &&
                            typeof el.setSinkId === "function"
                          ) {
                            el.setSinkId(audioOutputDeviceId).catch(() => {});
                          }
                        } catch (e) {}
                      }
                    }}
                    autoPlay
                    playsInline
                    className="video-element"
                  />
                )}
                <div className="video-info">
                  <span className="participant-name">
                    {(peersRef.current.get(socketId) &&
                      peersRef.current.get(socketId).name) ||
                      "Peer"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showChat && (
          <div className="side-panel chat-panel">
            <div className="panel-header">
              <h3>Chat</h3>
              <button
                className="close-panel"
                onClick={() => setShowChat(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="empty-state">
                  No messages yet. Start the conversation!
                </p>
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
              <button
                className="close-panel"
                onClick={() => setShowParticipants(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="participants-list">
              {participants.map((participant) => (
                <div key={participant.id} className="participant-item">
                  <div className="participant-avatar">
                    {getInitials(participant.name)}
                  </div>
                  <div className="participant-meta">
                    <span className="participant-item-name">
                      {participant.name}
                      {participant.isSelf ? " (You)" : ""}
                    </span>
                    <span className="participant-subtext">
                      {participant.isMuted ? "Muted" : "Speaking"}
                    </span>
                  </div>
                  <div className="participant-status">
                    {participant.isMuted ? (
                      <MicOff size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                    {participant.isVideoOff ? (
                      <VideoOff size={16} />
                    ) : (
                      <Video size={16} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="meeting-controls">
        {toasts.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: 16,
              right: 16,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#111827",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 10,
                  boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
                  maxWidth: 360,
                }}
              >
                {t.msg}
              </div>
            ))}
          </div>
        )}
        <div className="controls-left">
          <span className="meeting-id-badge">ID: {meetingId}</span>
        </div>
        <div className="controls-center">
          <button
            className={`control-btn ${isMuted ? "active" : ""}`}
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          <button
            className={`control-btn ${isVideoOff ? "active" : ""}`}
            onClick={toggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
          <button
            className={`control-btn ${isScreenSharing ? "active" : ""}`}
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
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
          <EllipsisVertical
            onClick={() => setIsOptionOpen(!isOptionOpen)}
            size={24}
            className="ellipsis control-btn"
          />

          {isOptionOpen && (
            <div className="options">
              <button
                className={`control-btn ${showChat ? "active" : ""}`}
                onClick={() => {
                  setShowChat(!showChat);
                  setIsOptionOpen(!isOptionOpen);
                  setShowParticipants(!showParticipants);
                }}
                title="Chat"
              >
                <MessageSquare size={24} />
              </button>
              <button
                className={`control-btn ${showParticipants ? "active" : ""}`}
                onClick={() => {
                  setShowParticipants(!showParticipants);
                  setIsOptionOpen(!isOptionOpen);
                  setShowChat(!showChat);
                }}
                title="Participants"
              >
                <Users size={24} />
              </button>
            </div>
          )}
        </div>
        <div className="controls-right">
          <button
            className={`control-btn ${showChat ? "active" : ""}`}
            onClick={() => setShowChat(!showChat)}
            title="Chat"
          >
            <MessageSquare size={24} />
          </button>
          <button
            className={`control-btn ${showParticipants ? "active" : ""}`}
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
