require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const http = require("http");
const { Server } = require("socket.io");
const Meeting = require("./Models/Meeting");
const jwt = require("jsonwebtoken");
const User = require("./Models/User");

const app = express();
connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "https://video-conferencing-app-one-coral.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/api/users", userRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => {
  res.send("Root route working");
});

// Handle CORS errors gracefully
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS Error: Origin not allowed" });
  }
  next(err);
});

// 404 handler (for unmatched routes)
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  // Handle known CORS error explicitly
  if (err && err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS Error: Origin not allowed" });
  }

  // Mongoose validation error
  if (err && err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }

  // JWT errors
  if (
    err &&
    (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
  ) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Only include stack in non-production
  const payload = { message };
  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.status(status).json(payload);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Socket auth: verify JWT from handshake
io.use(async (socket, next) => {
  try {
    const headerAuth =
      socket.handshake.headers && socket.handshake.headers.authorization;
    const fromHeader =
      headerAuth && headerAuth.startsWith("Bearer ")
        ? headerAuth.split(" ")[1]
        : null;
    const fromAuth =
      socket.handshake.auth && socket.handshake.auth.token
        ? socket.handshake.auth.token
        : null;
    const token = fromAuth || fromHeader;
    if (!token) {
      return next(new Error("Unauthorized"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(
      "_id name email photoURL"
    );
    if (!user) {
      return next(new Error("Unauthorized"));
    }
    socket.authUser = user;
    next();
  } catch (err) {
    return next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-meeting", ({ meetingId }) => {
    socket.join(meetingId);
    socket.meetingId = meetingId;
    socket.userId = socket.authUser?._id?.toString();

    socket.to(meetingId).emit("user-joined", {
      userId: socket.userId,
      userName: socket.authUser?.name || "User",
      socketId: socket.id,
    });

    // Persist meeting and participant
    (async () => {
      try {
        let meeting = await Meeting.findOne({ meetingId });
        if (!meeting) {
          meeting = await Meeting.create({
            meetingId,
            hostId: socket.userId,
            participants: [
              {
                userId: socket.userId,
                socketId: socket.id,
                joinedAt: new Date(),
              },
            ],
            startedAt: new Date(),
            isActive: true,
          });
        } else {
          const exists = meeting.participants.some(
            (p) => p.socketId === socket.id
          );
          if (!exists) {
            meeting.participants.push({
              userId: socket.userId,
              socketId: socket.id,
              joinedAt: new Date(),
            });
          }
          meeting.isActive = true;
          if (!meeting.startedAt) meeting.startedAt = new Date();
          await meeting.save();
        }
      } catch (e) {
        console.error("Meeting persist error (join):", e.message);
      }
    })();
  });

  socket.on("offer", ({ meetingId, offer, from }) => {
    socket.to(meetingId).emit("offer", { offer, from });
  });

  socket.on("answer", ({ meetingId, answer, from }) => {
    socket.to(meetingId).emit("answer", { answer, from });
  });

  socket.on("ice-candidate", ({ meetingId, candidate, from }) => {
    socket.to(meetingId).emit("ice-candidate", { candidate, from });
  });

  socket.on("chat-message", ({ meetingId, message, sender, userId }) => {
    io.to(meetingId).emit("chat-message", {
      message,
      sender,
      userId,
      from: socket.id,
      timestamp: new Date(),
    });
  });

  socket.on("media-state", ({ meetingId, userId, isMuted, isVideoOff }) => {
    socket.to(meetingId).emit("media-state", { userId, isMuted, isVideoOff });
  });

  socket.on("leave-meeting", ({ meetingId, userId }) => {
    socket.to(meetingId).emit("user-left", { userId, socketId: socket.id });
    socket.leave(meetingId);

    // Update DB on leave
    (async () => {
      try {
        const meeting = await Meeting.findOne({ meetingId });
        if (meeting) {
          meeting.participants = meeting.participants.filter(
            (p) => p.socketId !== socket.id
          );
          if (meeting.participants.length === 0) {
            meeting.isActive = false;
            meeting.endedAt = new Date();
          }
          await meeting.save();
        }
      } catch (e) {
        console.error("Meeting persist error (leave):", e.message);
      }
    })();
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (socket.meetingId && socket.userId) {
      socket.to(socket.meetingId).emit("user-left", {
        userId: socket.userId,
        socketId: socket.id,
      });
      // Persist disconnect similar to leave
      (async () => {
        try {
          const meeting = await Meeting.findOne({
            meetingId: socket.meetingId,
          });
          if (meeting) {
            meeting.participants = meeting.participants.filter(
              (p) => p.socketId !== socket.id
            );
            if (meeting.participants.length === 0) {
              meeting.isActive = false;
              meeting.endedAt = new Date();
            }
            await meeting.save();
          }
        } catch (e) {
          console.error("Meeting persist error (disconnect):", e.message);
        }
      })();
    }
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Socket.IO Signaling Server Ready");
});
