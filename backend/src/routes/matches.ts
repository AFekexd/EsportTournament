import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const matchesRouter = Router();

// ELO calculation constants
const K_FACTOR = 32;

function calculateEloChange(winnerElo: number, loserElo: number): number {
    const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    return Math.round(K_FACTOR * (1 - expectedScore));
}

// Get match by ID
matchesRouter.get(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: {
                tournament: { include: { game: true } },
                homeTeam: {
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
                awayTeam: {
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
                winner: true,
            },
        });

        if (!match) {
            throw new ApiError('Match not found', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: match });
    })
);

// Update match result (organizer+)
matchesRouter.patch(
    '/:id/result',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Only organizers can update match results', 403, 'FORBIDDEN');
        }

        const { homeScore, awayScore, winnerId } = req.body;

        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: {
                homeTeam: true,
                awayTeam: true,
                tournament: true,
            },
        });

        if (!match) {
            throw new ApiError('Match not found', 404, 'NOT_FOUND');
        }

        if (match.status === 'COMPLETED') {
            throw new ApiError('Match already completed', 400, 'ALREADY_COMPLETED');
        }

        // Validate winner
        if (winnerId && winnerId !== match.homeTeamId && winnerId !== match.awayTeamId) {
            throw new ApiError('Invalid winner', 400, 'INVALID_WINNER');
        }

        // Determine winner if not provided
        let actualWinnerId = winnerId;
        if (!actualWinnerId && homeScore !== undefined && awayScore !== undefined) {
            if (homeScore > awayScore) {
                actualWinnerId = match.homeTeamId;
            } else if (awayScore > homeScore) {
                actualWinnerId = match.awayTeamId;
            }
        }

        // Update match
        const updatedMatch = await prisma.match.update({
            where: { id: req.params.id },
            data: {
                homeScore,
                awayScore,
                winnerId: actualWinnerId,
                status: 'COMPLETED',
                playedAt: new Date(),
            },
            include: {
                homeTeam: true,
                awayTeam: true,
            },
        });

        // Update ELO for both teams
        if (actualWinnerId && match.homeTeam && match.awayTeam) {
            const winnerTeam = actualWinnerId === match.homeTeamId ? match.homeTeam : match.awayTeam;
            const loserTeam = actualWinnerId === match.homeTeamId ? match.awayTeam : match.homeTeam;

            const eloChange = calculateEloChange(winnerTeam.elo, loserTeam.elo);

            await prisma.team.update({
                where: { id: winnerTeam.id },
                data: { elo: { increment: eloChange } },
            });

            await prisma.team.update({
                where: { id: loserTeam.id },
                data: { elo: { decrement: eloChange } },
            });
        }

        // Advance winner to next round
        if (actualWinnerId) {
            const nextRound = match.round + 1;
            const nextPosition = Math.ceil(match.position / 2);

            const nextMatch = await prisma.match.findFirst({
                where: {
                    tournamentId: match.tournamentId,
                    round: nextRound,
                    position: nextPosition,
                },
            });

            if (nextMatch) {
                // Determine if winner goes to home or away slot
                const isHomeSlot = match.position % 2 === 1;

                await prisma.match.update({
                    where: { id: nextMatch.id },
                    data: isHomeSlot
                        ? { homeTeamId: actualWinnerId }
                        : { awayTeamId: actualWinnerId },
                });
            } else {
                // This was the final match - tournament complete
                await prisma.tournament.update({
                    where: { id: match.tournamentId },
                    data: { status: 'COMPLETED' },
                });
            }
        }

        res.json({ success: true, data: updatedMatch });
    })
);

// Schedule match (organizer+)
matchesRouter.patch(
    '/:id/schedule',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Only organizers can schedule matches', 403, 'FORBIDDEN');
        }

        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            throw new ApiError('Scheduled time is required', 400, 'MISSING_TIME');
        }

        const match = await prisma.match.update({
            where: { id: req.params.id },
            data: { scheduledAt: new Date(scheduledAt) },
        });

        res.json({ success: true, data: match });
    })
);

// Get upcoming matches for a team
matchesRouter.get(
    '/team/:teamId/upcoming',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { homeTeamId: req.params.teamId },
                    { awayTeamId: req.params.teamId },
                ],
                status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
            include: {
                tournament: { include: { game: true } },
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
            },
            orderBy: { scheduledAt: 'asc' },
        });

        res.json({ success: true, data: matches });
    })
);
