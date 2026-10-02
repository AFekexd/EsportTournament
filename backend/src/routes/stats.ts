import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router: Router = Router();

// In-memory cache for aggregate platform metrics
let cachedStats: any = null;
let statsExpiry = 0;
const STATS_TTL = 30 * 1000; // 30 seconds

/**
 * GET /api/stats
 * Get platform statistics (Cached for 30s)
 */
router.get('/', async (req, res, next) => {
  try {
    if (cachedStats && Date.now() < statsExpiry) {
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(cachedStats);
    }
    const [
      activeTournamentsCount,
      registeredUsersCount,
      createdTeamsCount,
      playedMatchesCount,
      usersByRole,
      recentRegistrations,
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
          OR: [
            { status: 'COMPLETED' },
            { playedAt: { not: null } }
          ]
        },
      }),
      // Count users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }),
      // Get recent registrations
      prisma.tournamentEntry.findMany({
        take: 5,
        orderBy: { registeredAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          team: { select: { id: true, name: true, logoUrl: true } },
          tournament: { 
             select: { 
               id: true, 
               name: true,
               game: { select: { name: true } }
             } 
          }
        }
      })
    ]);

    const roleCounts = usersByRole.reduce((acc, curr) => {
      acc[curr.role] = curr._count.role;
      return acc;
    }, {} as Record<string, number>);

    cachedStats = {
      activeTournaments: activeTournamentsCount,
      registeredUsers: registeredUsersCount,
      createdTeams: createdTeamsCount,
      playedMatches: playedMatchesCount,
      usersByRole: roleCounts,
      recentRegistrations
    };
    statsExpiry = Date.now() + STATS_TTL;

    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(cachedStats);
  } catch (error) {
    next(error);
  }
});

export { router as statsRouter };
