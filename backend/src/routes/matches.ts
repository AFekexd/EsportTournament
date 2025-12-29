import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
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
            throw new ApiError('A meccs nem található', 404, 'NOT_FOUND');
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
            throw new ApiError('Csak szervezők módosíthatják az eredményeket', 403, 'FORBIDDEN');
        }

        const { homeScore, awayScore, winnerId, winnerUserId } = req.body;

        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: {
                homeTeam: true,
                awayTeam: true,
                homeUser: true,
                awayUser: true,
                tournament: { include: { game: true } },
            },
        });

        if (!match) {
            throw new ApiError('A meccs nem található', 404, 'NOT_FOUND');
        }

        // Check if this is a solo (1v1) tournament
        const isSoloTournament = match.tournament.game?.teamSize === 1;

        // Validate winner for team matches
        if (winnerId && winnerId !== match.homeTeamId && winnerId !== match.awayTeamId) {
            throw new ApiError('Érvénytelen győztes', 400, 'INVALID_WINNER');
        }

        // Validate winner for solo matches
        if (winnerUserId && winnerUserId !== match.homeUserId && winnerUserId !== match.awayUserId) {
            throw new ApiError('Érvénytelen győztes felhasználó', 400, 'INVALID_WINNER');
        }

        // Determine winner if not provided
        let actualWinnerId = winnerId;
        let actualWinnerUserId = winnerUserId;

        if (isSoloTournament) {
            // Solo tournament - determine winnerUserId
            if (!actualWinnerUserId && homeScore !== undefined && awayScore !== undefined) {
                if (homeScore > awayScore) {
                    actualWinnerUserId = match.homeUserId;
                } else if (awayScore > homeScore) {
                    actualWinnerUserId = match.awayUserId;
                }
            }
        } else {
            // Team tournament - determine winnerId
            if (!actualWinnerId && homeScore !== undefined && awayScore !== undefined) {
                if (homeScore > awayScore) {
                    actualWinnerId = match.homeTeamId;
                } else if (awayScore > homeScore) {
                    actualWinnerId = match.awayTeamId;
                }
            }
        }

        // Update match
        const updatedMatch = await prisma.match.update({
            where: { id: req.params.id },
            data: {
                homeScore,
                awayScore,
                winnerId: actualWinnerId,
                winnerUserId: actualWinnerUserId,
                status: 'COMPLETED',
                playedAt: new Date(),
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                homeUser: true,
                awayUser: true,
            },
        });

        // Log match result update
        const p1 = match.homeUser?.username || match.homeTeam?.name || 'Home';
        const p2 = match.awayUser?.username || match.awayTeam?.name || 'Away';
        await logSystemActivity(
            'MATCH_RESULT_UPDATE',
            `Match ${p1} vs ${p2} result updated to ${homeScore}-${awayScore} by ${user.username}`,
            { 
                userId: user.id,
                metadata: {
                    matchId: match.id,
                    homeTeam: p1,
                    awayTeam: p2,
                    homeScore,
                    awayScore,
                    winner: actualWinnerId || actualWinnerUserId || 'Draw/None'
                }
            } // logged by organizer/admin (user.id)
        );

        // Update ELO
        if (isSoloTournament && actualWinnerUserId && match.homeUser && match.awayUser) {
            // Solo match - update user ELO
            const winnerUser = actualWinnerUserId === match.homeUserId ? match.homeUser : match.awayUser;
            const loserUser = actualWinnerUserId === match.homeUserId ? match.awayUser : match.homeUser;

            const eloChange = calculateEloChange(winnerUser.elo, loserUser.elo);

            await prisma.user.update({
                where: { id: winnerUser.id },
                data: { elo: { increment: eloChange } },
            });

            await prisma.user.update({
                where: { id: loserUser.id },
                data: { elo: { decrement: eloChange } },
            });
        } else if (!isSoloTournament && actualWinnerId && match.homeTeam && match.awayTeam) {
            // Team match - update team ELO
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

        // Send notifications if enabled
        if (match.tournament.notifyUsers || match.tournament.notifyDiscord) {
            // Import notification service
            const { notificationService } = await import('../services/notificationService.js');
            const { discordService } = await import('../services/discordService.js');

            // Send in-app notifications to team members
            if (match.tournament.notifyUsers) {
                await notificationService.notifyMatchResultToTeams(updatedMatch, match.tournament);
            }

            // Send Discord notification
            if (match.tournament.notifyDiscord && (actualWinnerId || actualWinnerUserId)) {
                const homeTeamName = updatedMatch.homeTeam?.name || updatedMatch.homeUser?.displayName || updatedMatch.homeUser?.username || 'Ismeretlen';
                const awayTeamName = updatedMatch.awayTeam?.name || updatedMatch.awayUser?.displayName || updatedMatch.awayUser?.username || 'Ismeretlen';
                const winnerName = isSoloTournament
                    ? (actualWinnerUserId === updatedMatch.homeUserId ? homeTeamName : awayTeamName)
                    : (actualWinnerId === updatedMatch.homeTeamId ? homeTeamName : awayTeamName);

                await discordService.sendMatchResult({
                    tournament: match.tournament.name,
                    homeTeam: homeTeamName,
                    awayTeam: awayTeamName,
                    homeScore: updatedMatch.homeScore ?? 0,
                    awayScore: updatedMatch.awayScore ?? 0,
                    winner: winnerName,
                }, match.tournament.discordChannelId || 'matches');
            }
        }

        // Advance winner to next round (and handle loser for double elimination)
        const hasWinner = isSoloTournament ? actualWinnerUserId : actualWinnerId;

        if (hasWinner) {
            // Get loser ID for double elimination drops
            const loserId = isSoloTournament
                ? (actualWinnerUserId === match.homeUserId ? match.awayUserId : match.homeUserId)
                : (actualWinnerId === match.homeTeamId ? match.awayTeamId : match.homeTeamId);

            if (match.tournament.format === 'DOUBLE_ELIMINATION') {
                // ==========================================
                // DOUBLE ELIMINATION LOGIC
                // ==========================================

                if (match.bracketType === 'UPPER') {
                    // Winner advances in upper bracket
                    const nextRound = match.round + 1;
                    const nextPosition = Math.ceil(match.position / 2);

                    const nextUpperMatch = await prisma.match.findFirst({
                        where: {
                            tournamentId: match.tournamentId,
                            bracketType: 'UPPER',
                            round: nextRound,
                            position: nextPosition,
                        },
                    });

                    if (nextUpperMatch) {
                        const isHomeSlot = match.position % 2 === 1;
                        const updateData = isSoloTournament
                            ? (isHomeSlot ? { homeUserId: actualWinnerUserId } : { awayUserId: actualWinnerUserId })
                            : (isHomeSlot ? { homeTeamId: actualWinnerId } : { awayTeamId: actualWinnerId });

                        await prisma.match.update({
                            where: { id: nextUpperMatch.id },
                            data: updateData,
                        });
                    } else {
                        // Upper bracket final - winner goes to grand final
                        const grandFinal = await prisma.match.findFirst({
                            where: {
                                tournamentId: match.tournamentId,
                                bracketType: 'GRAND_FINAL',
                            },
                        });
                        if (grandFinal) {
                            await prisma.match.update({
                                where: { id: grandFinal.id },
                                data: isSoloTournament
                                    ? { homeUserId: actualWinnerUserId }
                                    : { homeTeamId: actualWinnerId },
                            });
                        }
                    }

                    // Loser drops to lower bracket
                    if (loserId) {
                        const lowerRound = match.round === 1 ? 1 : match.round * 2 - 2;
                        const lowerPosition = Math.ceil(match.position / 2);

                        const lowerMatch = await prisma.match.findFirst({
                            where: {
                                tournamentId: match.tournamentId,
                                bracketType: 'LOWER',
                                round: lowerRound,
                                position: lowerPosition,
                            },
                        });

                        if (lowerMatch) {
                            const updateData = isSoloTournament
                                ? (lowerMatch.homeUserId ? { awayUserId: loserId } : { homeUserId: loserId })
                                : (lowerMatch.homeTeamId ? { awayTeamId: loserId } : { homeTeamId: loserId });

                            await prisma.match.update({
                                where: { id: lowerMatch.id },
                                data: updateData,
                            });
                        }
                    }

                } else if (match.bracketType === 'LOWER') {
                    // Winner advances in lower bracket
                    const nextLowerRound = match.round + 1;
                    const nextPosition = match.round % 2 === 0
                        ? Math.ceil(match.position / 2)
                        : match.position;

                    const nextLowerMatch = await prisma.match.findFirst({
                        where: {
                            tournamentId: match.tournamentId,
                            bracketType: 'LOWER',
                            round: nextLowerRound,
                        },
                        orderBy: { position: 'asc' },
                    });

                    if (nextLowerMatch) {
                        const updateData = isSoloTournament
                            ? (nextLowerMatch.homeUserId ? { awayUserId: actualWinnerUserId } : { homeUserId: actualWinnerUserId })
                            : (nextLowerMatch.homeTeamId ? { awayTeamId: actualWinnerId } : { homeTeamId: actualWinnerId });

                        await prisma.match.update({
                            where: { id: nextLowerMatch.id },
                            data: updateData,
                        });
                    } else {
                        // Lower bracket final - winner goes to grand final
                        const grandFinal = await prisma.match.findFirst({
                            where: {
                                tournamentId: match.tournamentId,
                                bracketType: 'GRAND_FINAL',
                            },
                        });
                        if (grandFinal) {
                            await prisma.match.update({
                                where: { id: grandFinal.id },
                                data: isSoloTournament
                                    ? { awayUserId: actualWinnerUserId }
                                    : { awayTeamId: actualWinnerId },
                            });
                        }
                    }

                } else if (match.bracketType === 'GRAND_FINAL') {
                    // Grand final completed - tournament done
                    await prisma.tournament.update({
                        where: { id: match.tournamentId },
                        data: { status: 'COMPLETED' },
                    });
                }

            } else {
                // ==========================================
                // SINGLE ELIMINATION LOGIC
                // ==========================================
                console.log('🏆 Single Elimination - Advancing winner');
                console.log('Current match:', { round: match.round, position: match.position, winnerId: actualWinnerId });

                const nextRound = match.round + 1;
                const nextPosition = Math.ceil(match.position / 2);

                console.log('Looking for next match:', { nextRound, nextPosition, tournamentId: match.tournamentId });

                const nextMatch = await prisma.match.findFirst({
                    where: {
                        tournamentId: match.tournamentId,
                        round: nextRound,
                        position: nextPosition,
                    },
                });

                console.log('Next match found:', nextMatch ? { id: nextMatch.id, round: nextMatch.round, position: nextMatch.position } : 'NULL');

                if (nextMatch) {
                    const isHomeSlot = match.position % 2 === 1;
                    const updateData = isSoloTournament
                        ? (isHomeSlot ? { homeUserId: actualWinnerUserId } : { awayUserId: actualWinnerUserId })
                        : (isHomeSlot ? { homeTeamId: actualWinnerId } : { awayTeamId: actualWinnerId });

                    console.log('Updating next match with:', { isHomeSlot, updateData });

                    await prisma.match.update({
                        where: { id: nextMatch.id },
                        data: updateData,
                    });

                    console.log('✅ Next match updated successfully');
                } else {
                    // This was the final match - tournament complete
                    console.log('🏁 Final match - completing tournament');
                    await prisma.tournament.update({
                        where: { id: match.tournamentId },
                        data: { status: 'COMPLETED' },
                    });
                }
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
            throw new ApiError('Csak szervezők ütemezhetnek meccseket', 403, 'FORBIDDEN');
        }

        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            throw new ApiError('Az időpont megadása kötelező', 400, 'MISSING_TIME');
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
