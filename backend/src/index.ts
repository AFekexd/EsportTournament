import "dotenv/config";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io'; // Socket.IO

import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { logsRouter } from './routes/logs.js';

import { usersRouter } from './routes/users.js';

import { teamsRouter } from './routes/teams.js';
import { tournamentsRouter } from './routes/tournaments.js';
import { gamesRouter } from './routes/games.js';
import { matchesRouter } from './routes/matches.js';
import { statsRouter } from './routes/stats.js';
import { scrimsRouter } from './routes/scrims.js';
import { newsRouter } from './routes/news.js';
import { notificationsRouter } from './routes/notifications.js';
import { leaderboardsRouter } from './routes/leaderboards.js';
import { discordRouter } from './routes/discordSettings.js';
import { bookingsRouter } from './routes/bookings.js';
import { shareRouter } from './routes/share.js';
import { BookingNotificationService } from './services/BookingNotificationService.js';
import { TournamentSchedulerService } from './services/TournamentSchedulerService.js';
import { setIo } from './services/socket.js';

// Kiosk Routes
import { steamRouter } from './routes/steam.js';
import { changeRequestsRouter } from './routes/changeRequests.js';

// Kiosk Routes
import { kioskRouter } from './routes/kiosk.js';
import { adminKioskRouter } from './routes/admin-kiosk.js';
import { clientUpdateRouter } from './routes/clientUpdate.js';
import { adminEmailRouter } from './routes/admin-email.js';
import { adminDiscordRouter } from './routes/admin-discord.js';
import { digestService } from './services/digestService.js';
import { matchReminderService } from './services/matchReminderService.js';



// CORS origins from environment variable or default
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [
    'http://localhost:5173',
    'http://localhost:4173',
    'https://esport.afeke.com',
    'http://esport.afeke.com',
    'https://esport-backend.pollak.info',
    'https://esport.pollak.info',
    'http://esport.pollak.info'
  ];

const app: express.Express = express();

// Trust proxy - kritikus a helyes kliens IP meghatározásához reverse proxy/Docker mögött
// Ez lehetővé teszi az X-Forwarded-For header használatát
app.set('trust proxy', true);

const httpServer = createServer(app); // Create HTTP server for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
setIo(io);

// Start background jobs
BookingNotificationService.startReminderJob();
TournamentSchedulerService.startScheduler();
digestService.startScheduler();
matchReminderService.startScheduler();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: corsOrigins,
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
app.use('/api/scrims', scrimsRouter);
app.use('/api/news', newsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/leaderboards', leaderboardsRouter);
app.use('/api/discord', discordRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/steam', steamRouter);
import { changelogRouter } from './routes/changelog.js';

// ...

app.use('/api/change-requests', changeRequestsRouter);
app.use('/api/changelog', changelogRouter);
app.use('/share', shareRouter);

// Kiosk & Admin Kiosk Routes
app.use('/api/kiosk', kioskRouter);
app.use('/api/admin/kiosk', adminKioskRouter);
app.use('/api/admin/email', adminEmailRouter);
app.use('/api/admin/discord', adminDiscordRouter);
app.use('/api/client/update', clientUpdateRouter);
import unsubscribeRouter from './routes/unsubscribe.js';
app.use('/api/unsubscribe', unsubscribeRouter);

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
  console.log(`Backend restart forced at ${new Date().toISOString()}`);
});

export default app;
