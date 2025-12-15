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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
