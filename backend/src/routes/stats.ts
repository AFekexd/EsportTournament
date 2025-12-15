import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/stats
 * Get platform statistics
 */
router.get('/', async (req, res, next) => {
  try {
    const [
      activeTournamentsCount,
      registeredUsersCount,
      createdTeamsCount,
      playedMatchesCount,
    ] = await Promise.all([
      // Count active tournaments (REGISTRATION or IN_PROGRESS)
      prisma.tournament.count({
        where: {
          status: {
            in: ['REGISTRATION', 'IN_PROGRESS'],
          },
        },
      }),
      // Count registered users
      prisma.user.count(),
      // Count created teams
      prisma.team.count(),
      // Count completed matches
      prisma.match.count({
        where: {
          status: 'COMPLETED',
        },
      }),
    ]);

    res.json({
      activeTournaments: activeTournamentsCount,
      registeredUsers: registeredUsersCount,
      createdTeams: createdTeamsCount,
      playedMatches: playedMatchesCount,
    });
  } catch (error) {
    next(error);
  }
});

export { router as statsRouter };
