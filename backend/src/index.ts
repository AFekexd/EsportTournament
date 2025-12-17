import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

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
import { BookingNotificationService } from './services/BookingNotificationService.js';

dotenv.config();

const app = express();
// Start background jobs
BookingNotificationService.startReminderJob();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

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

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
