require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const http        = require('http');
const { Server }  = require('socket.io');

const connectDB       = require('./config/db');
const authRoutes      = require('./routes/auth');
const profileRoutes   = require('./routes/profiles');
const meetingRoutes   = require('./routes/meetings');
const videoRoutes     = require('./routes/video');
const documentRoutes  = require('./routes/documents');
const paymentRoutes   = require('./routes/payments');
const errorHandler    = require('./middleware/errorHandler');
const swaggerUi   = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// ── Bootstrap DB ───────────────────────────────────────────────────────────
connectDB();

const app    = express();
const server = http.createServer(app);

// ── Socket.IO setup ────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// ── WebRTC Signaling ───────────────────────────────────────────────────────
const rooms = {}; // roomId -> [socketIds]

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // User joins a video room
  socket.on('join-room', ({ roomId, userId, userName }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ socketId: socket.id, userId, userName });

    // Tell others in room someone joined
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId,
      userName,
    });

    // Send existing users to the new joiner
    const others = rooms[roomId].filter(u => u.socketId !== socket.id);
    socket.emit('existing-users', others);

    console.log(`👥 ${userName} joined room: ${roomId}`);
  });

  // WebRTC offer
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  // WebRTC answer
  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  // ICE candidates
  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // Toggle audio/video
  socket.on('toggle-media', ({ roomId, type, enabled }) => {
    socket.to(roomId).emit('user-toggle-media', {
      socketId: socket.id,
      type,
      enabled,
    });
  });

  // User leaves room
  socket.on('leave-room', ({ roomId }) => {
    handleLeave(socket, roomId);
  });

  // On disconnect
  socket.on('disconnect', () => {
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId]?.some(u => u.socketId === socket.id)) {
        handleLeave(socket, roomId);
      }
    });
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

const handleLeave = (socket, roomId) => {
  if (rooms[roomId]) {
    rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
    if (rooms[roomId].length === 0) delete rooms[roomId];
  }
  socket.to(roomId).emit('user-left', { socketId: socket.id });
  socket.leave(roomId);
};

// ── Security & request middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth requests' },
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'Nexus API is running 🚀' })
);

app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/video',    videoRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Nexus API Docs',
  customCss: '.swagger-ui .topbar { background-color: #4f46e5; }',
}));

// ── 404 & Error handlers ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);


// ── Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀  Nexus API running on port ${PORT}  [${process.env.NODE_ENV}]`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = { app, io };