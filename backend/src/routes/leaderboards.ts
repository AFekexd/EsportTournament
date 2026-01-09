import { Router, Response } from 'express';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';

export const leaderboardsRouter = Router();

// Get global player leaderboard
leaderboardsRouter.get(
    '/players',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { gameId, limit = '50', page = '1' } = req.query;

        const where: any = {};

        // Always exclude ADMIN and TEACHER roles
        where.role = {
            notIn: ['ADMIN', 'TEACHER'],
        };

        if (gameId) {
            // Filter by game
            where.tournamentEntries = {
                some: {
                    tournament: {
                        gameId: gameId as string,
                    },
                },
            };
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [players, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    elo: true,
                    role: true,
                    _count: {
                        select: {
                            tournamentEntries: true,
                            wonMatches: true,
                            homeMatches: true,
                            awayMatches: true,
                        },
                    },
                },
                orderBy: [
                    {
                        wonMatches: {
                            _count: 'desc',
                        },
                    },
                    { elo: 'desc' },
                ],
                take: parseInt(limit as string),
                skip,
            }),
            prisma.user.count({ where }),
        ]);

        // Add rank to each player
        const rankedPlayers = players.map((player: any, index: number) => ({
            ...player,
            rank: skip + index + 1,
            matchesPlayed: player._count.homeMatches + player._count.awayMatches,
            matchesWon: player._count.wonMatches,
            winRate:
                player._count.homeMatches + player._count.awayMatches > 0
                    ? (player._count.wonMatches / (player._count.homeMatches + player._count.awayMatches)) * 100
                    : 0,
        }));

        res.json({
            success: true,
            data: rankedPlayers,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    })
);

// Get global team leaderboard
leaderboardsRouter.get(
    '/teams',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { gameId, limit = '50', page = '1' } = req.query;

        const where: any = {};
        if (gameId) {
            where.tournamentEntries = {
                some: {
                    tournament: {
                        gameId: gameId as string,
                    },
                },
            };
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [teams, total] = await Promise.all([
            prisma.team.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    elo: true,
                    _count: {
                        select: {
                            tournamentEntries: true,
                            wonMatches: true,
                            homeMatches: true,
                            awayMatches: true,
                        },
                    },
                    members: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    displayName: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                        take: 5,
                    },
                },
                orderBy: { elo: 'desc' },
                take: parseInt(limit as string),
                skip,
            }),
            prisma.team.count({ where }),
        ]);

        // Add rank to each team
        const rankedTeams = teams.map((team: any, index: number) => ({
            ...team,
            rank: skip + index + 1,
            matchesPlayed: team._count.homeMatches + team._count.awayMatches,
            matchesWon: team._count.wonMatches,
            winRate:
                team._count.homeMatches + team._count.awayMatches > 0
                    ? (team._count.wonMatches / (team._count.homeMatches + team._count.awayMatches)) * 100
                    : 0,
        }));

        res.json({
            success: true,
            data: rankedTeams,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    })
);

// Get top players (podium)
leaderboardsRouter.get(
    '/players/top',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { gameId } = req.query;

        const where: any = {};

        // Always exclude ADMIN and TEACHER roles
        where.role = {
            notIn: ['ADMIN', 'TEACHER'],
        };

        if (gameId) {
            where.tournamentEntries = {
                some: {
                    tournament: {
                        gameId: gameId as string,
                    },
                },
            };
        }

        const topPlayers = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                elo: true,
                role: true,
                _count: {
                    select: {
                        wonMatches: true,
                        homeMatches: true,
                        awayMatches: true,
                    },
                },
            },
            orderBy: [
                {
                    wonMatches: {
                        _count: 'desc',
                    },
                },
                { elo: 'desc' },
            ],
            take: 3,
        });

        const rankedPlayers = topPlayers.map((player: any, index: number) => ({
            ...player,
            rank: index + 1,
            matchesPlayed: player._count.homeMatches + player._count.awayMatches,
            matchesWon: player._count.wonMatches,
            winRate:
                player._count.homeMatches + player._count.awayMatches > 0
                    ? (player._count.wonMatches / (player._count.homeMatches + player._count.awayMatches)) * 100
                    : 0,
        }));

        res.json({ success: true, data: rankedPlayers });
    })
);

// Get top steam players
leaderboardsRouter.get(
    '/steam/top',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { limit = '10' } = req.query;

        const players = await prisma.user.findMany({
            where: {
                perfectGamesCount: { gt: 0 },
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                steamId: true,
                perfectGamesCount: true,
            },
            orderBy: {
                perfectGamesCount: 'desc'
            },
            take: parseInt(limit as string)
        });

        const ranked = players.map((p, i) => ({ ...p, rank: i + 1 }));

        res.json({ success: true, data: ranked });
    })
);
