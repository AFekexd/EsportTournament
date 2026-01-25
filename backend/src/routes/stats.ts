import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router: Router = Router();

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

    res.json({
      activeTournaments: activeTournamentsCount,
      registeredUsers: registeredUsersCount,
      createdTeams: createdTeamsCount,
      playedMatches: playedMatchesCount,
      usersByRole: roleCounts,
      recentRegistrations
    });
  } catch (error) {
    next(error);
  }
});

export { router as statsRouter };
