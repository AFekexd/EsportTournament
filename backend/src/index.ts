import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io'; // Socket.IO

import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { teamsRouter } from './routes/teams.js';
import { tournamentsRouter } from './routes/tournaments.js';
import { gamesRouter } from './routes/games.js';
import { matchesRouter } from './routes/matches.js';
import { statsRouter } from './routes/stats.js';
import { notificationsRouter } from './routes/notifications.js';
import { leaderboardsRouter } from './routes/leaderboards.js';
import { discordRouter } from './routes/discordSettings.js';
import { bookingsRouter } from './routes/bookings.js';
import { shareRouter } from './routes/share.js';
import { BookingNotificationService } from './services/BookingNotificationService.js';
import { TournamentSchedulerService } from './services/TournamentSchedulerService.js';
import { setIo } from './services/socket.js';

// Kiosk Routes
import { kioskRouter } from './routes/kiosk.js';
import { adminKioskRouter } from './routes/admin-kiosk.js';

dotenv.config();

const app = express();
const httpServer = createServer(app); // Create HTTP server for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://esport.afeke.com',
      'http://esport.afeke.com'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});
setIo(io);

// Start background jobs
BookingNotificationService.startReminderJob();
TournamentSchedulerService.startScheduler();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://esport.afeke.com',
    'http://esport.afeke.com'
  ],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Make io available to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/leaderboards', leaderboardsRouter);
app.use('/api/discord', discordRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/share', shareRouter);

// Kiosk & Admin Kiosk Routes
app.use('/api/kiosk', kioskRouter);
app.use('/api/admin/kiosk', adminKioskRouter);

// Error handler
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('[SOCKET] Client connected:', socket.id);

  // Subscribe to machine status updates
  socket.on('subscribe:machine', (machineId: string) => {
    socket.join(`machine:${machineId}`);
    console.log(`[SOCKET] Client ${socket.id} subscribed to machine:${machineId}`);
  });

  // Subscribe to user updates
  socket.on('subscribe:user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`[SOCKET] Client ${socket.id} subscribed to user:${userId}`);
  });

  // Subscribe to all sessions (admin dashboard)
  socket.on('subscribe:all-sessions', () => {
    socket.join('all-sessions');
    console.log(`[SOCKET] Client ${socket.id} subscribed to all-sessions`);
  });

  socket.on('disconnect', () => {
    console.log('[SOCKET] Client disconnected:', socket.id);
  });
});

// Start Server via httpServer
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});

export default app;
