require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const cors = require("cors");
const userRoutes = require('./routes/userRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const http = require('http');
const { Server } = require('socket.io');
const Meeting = require('./Models/Meeting');

const app = express();
connectDB();

const allowedOrigins = ['http://localhost:5173'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use('/api/users', userRoutes);
app.use('/api/meetings', meetingRoutes);

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

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('join-meeting', ({ meetingId, userId, userName }) => {
        socket.join(meetingId);
        socket.meetingId = meetingId;
        socket.userId = userId;

        socket.to(meetingId).emit('user-joined', {
            userId,
            userName,
            socketId: socket.id
        });

        // Persist meeting and participant
        (async () => {
            try {
                let meeting = await Meeting.findOne({ meetingId });
                if (!meeting) {
                    meeting = await Meeting.create({
                        meetingId,
                        hostId: userId,
                        participants: [{ userId, socketId: socket.id, joinedAt: new Date() }],
                        startedAt: new Date(),
                        isActive: true
                    });
                } else {
                    const exists = meeting.participants.some(p => p.socketId === socket.id);
                    if (!exists) {
                        meeting.participants.push({ userId, socketId: socket.id, joinedAt: new Date() });
                    }
                    meeting.isActive = true;
                    if (!meeting.startedAt) meeting.startedAt = new Date();
                    await meeting.save();
                }
            } catch (e) {
                console.error('Meeting persist error (join):', e.message);
            }
        })();
    });

    socket.on('offer', ({ meetingId, offer, from }) => {
        socket.to(meetingId).emit('offer', { offer, from });
    });

    socket.on('answer', ({ meetingId, answer, from }) => {
        socket.to(meetingId).emit('answer', { answer, from });
    });

    socket.on('ice-candidate', ({ meetingId, candidate, from }) => {
        socket.to(meetingId).emit('ice-candidate', { candidate, from });
    });

    socket.on('chat-message', ({ meetingId, message, sender, userId }) => {
        io.to(meetingId).emit('chat-message', {
            message,
            sender,
            userId,
            from: socket.id,
            timestamp: new Date()
        });
    });

    socket.on('media-state', ({ meetingId, userId, isMuted, isVideoOff }) => {
        socket.to(meetingId).emit('media-state', { userId, isMuted, isVideoOff });
    });

    socket.on('leave-meeting', ({ meetingId, userId }) => {
        socket.to(meetingId).emit('user-left', { userId, socketId: socket.id });
        socket.leave(meetingId);

        // Update DB on leave
        (async () => {
            try {
                const meeting = await Meeting.findOne({ meetingId });
                if (meeting) {
                    meeting.participants = meeting.participants.filter(p => p.socketId !== socket.id);
                    if (meeting.participants.length === 0) {
                        meeting.isActive = false;
                        meeting.endedAt = new Date();
                    }
                    await meeting.save();
                }
            } catch (e) {
                console.error('Meeting persist error (leave):', e.message);
            }
        })();
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
        if (socket.meetingId && socket.userId) {
            socket.to(socket.meetingId).emit('user-left', {
                userId: socket.userId,
                socketId: socket.id
            });
            // Persist disconnect similar to leave
            (async () => {
                try {
                    const meeting = await Meeting.findOne({ meetingId: socket.meetingId });
                    if (meeting) {
                        meeting.participants = meeting.participants.filter(p => p.socketId !== socket.id);
                        if (meeting.participants.length === 0) {
                            meeting.isActive = false;
                            meeting.endedAt = new Date();
                        }
                        await meeting.save();
                    }
                } catch (e) {
                    console.error('Meeting persist error (disconnect):', e.message);
                }
            })();
        }
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Socket.IO Signaling Server Ready');
});
