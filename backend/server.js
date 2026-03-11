require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const meetingRoutes = require("./routes/meetings");
const { verifySocketToken } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// Accept comma-separated origins, e.g. "https://live.empire216.co.za,http://localhost:8080"
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "http://localhost:8080")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH"],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });
app.use(cors(corsOptions));
app.use(express.json());

// REST routes
app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── WebRTC Signaling via Socket.io ───────────────────────────────────────────
// rooms[roomId] = Map<socketId, { userId, displayName, language }>
const rooms = {};

io.use(verifySocketToken);

io.on("connection", (socket) => {
  const user = socket.data.user;
  console.log(`[ws] connected: ${user.displayName} (${socket.id})`);

  // Join a meeting room
  socket.on("join-room", ({ roomId, language }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = new Map();
    rooms[roomId].set(socket.id, {
      userId: user.userId,
      displayName: user.displayName,
      language: language || "EN",
    });

    // Tell the new peer about everyone already in the room
    const existing = [];
    rooms[roomId].forEach((peer, peerId) => {
      if (peerId !== socket.id) existing.push({ peerId, ...peer });
    });
    socket.emit("room-peers", existing);

    // Tell everyone else a new peer arrived
    socket.to(roomId).emit("peer-joined", {
      peerId: socket.id,
      userId: user.userId,
      displayName: user.displayName,
      language: language || "EN",
    });

    console.log(`[ws] ${user.displayName} joined room ${roomId}`);
  });

  // WebRTC: forward offer to target peer
  socket.on("webrtc-offer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc-offer", { fromId: socket.id, sdp });
  });

  // WebRTC: forward answer to target peer
  socket.on("webrtc-answer", ({ targetId, sdp }) => {
    io.to(targetId).emit("webrtc-answer", { fromId: socket.id, sdp });
  });

  // WebRTC: forward ICE candidate to target peer
  socket.on("webrtc-ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("webrtc-ice-candidate", { fromId: socket.id, candidate });
  });

  // Translation broadcast: share a translated utterance to the whole room
  socket.on("translation-utterance", ({ roomId, utterance }) => {
    socket.to(roomId).emit("translation-utterance", {
      fromId: socket.id,
      displayName: user.displayName,
      ...utterance,
    });
  });

  // Chat message: broadcast to whole room (including sender for echo)
  socket.on("chat-message", ({ roomId, text }) => {
    const msg = {
      id: `${socket.id}-${Date.now()}`,
      fromId: socket.id,
      displayName: user.displayName,
      text,
      timestamp: new Date().toISOString(),
    };
    io.to(roomId).emit("chat-message", msg);
  });

  // Peer status: broadcast mute / video-off state changes
  socket.on("peer-status", ({ roomId, isMuted, isVideoOff }) => {
    socket.to(roomId).emit("peer-status", {
      peerId: socket.id,
      isMuted,
      isVideoOff,
    });
  });

  // Leave room cleanly
  socket.on("leave-room", ({ roomId }) => {
    leaveRoom(socket, roomId);
  });

  socket.on("disconnect", () => {
    // Remove from all rooms
    for (const roomId of Object.keys(rooms)) {
      if (rooms[roomId].has(socket.id)) {
        leaveRoom(socket, roomId);
      }
    }
    console.log(`[ws] disconnected: ${socket.id}`);
  });
});

function leaveRoom(socket, roomId) {
  if (!rooms[roomId]) return;
  rooms[roomId].delete(socket.id);
  if (rooms[roomId].size === 0) delete rooms[roomId];
  socket.to(roomId).emit("peer-left", { peerId: socket.id });
  socket.leave(roomId);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
