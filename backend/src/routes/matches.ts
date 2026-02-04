import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { upload } from '../middleware/upload.js';

export const matchesRouter: Router = Router();

// ELO calculation constants
const K_FACTOR = 32;

function calculateEloChange(winnerElo: number, loserElo: number): number {
    const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    return Math.round(K_FACTOR * (1 - expectedScore));
}

// Get matches for a specific user
matchesRouter.get(
    '/user/:userId',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { userId } = req.params;

        // Find matches where user is either home or away participant
        // For team matches, we might need a more complex query if we want to show matches 
        // where user's team played, but for now we focus on where user is directly assigned 
        // (Solo tournaments) OR if we can link them via team membership.
        // The simplest approach for now is fetching direct user matches (1v1).

        const matches = await prisma.match.findMany({
            where: {
                OR: [
                    { homeUserId: userId },
                    { awayUserId: userId }
                ]
            },
            include: {
                tournament: {
                    include: {
                        game: true
                    }
                },
                homeUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                awayUser: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                // Include teams as well in case it's a mixed scenario or for display
                homeTeam: true,
                awayTeam: true
            },
            orderBy: [
                { playedAt: 'desc' }, // Recently played first
                { scheduledAt: 'desc' },
                { createdAt: 'desc' }
            ],
            take: 50 // Limit to last 50 matches for performance
        });

        res.json({
            success: true,
            data: matches
        });
    })
);

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
    upload.single('proof'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők módosíthatják az eredményeket', 403, 'FORBIDDEN');
        }

        let { homeScore, awayScore, winnerId, winnerUserId } = req.body;

        // Parse scores if they arrive as strings (e.g. from FormData)
        if (typeof homeScore === 'string') homeScore = parseInt(homeScore, 10);
        if (typeof awayScore === 'string') awayScore = parseInt(awayScore, 10);

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
                    winner: actualWinnerId || actualWinnerUserId || 'Draw/None',
                    previous: {
                        homeScore: match.homeScore,
                        awayScore: match.awayScore,
                        winnerId: match.winnerId,
                        winnerUserId: match.winnerUserId
                    }
                }
            } // logged by organizer/admin (user.id)
        );

        // Update ELO
        if (isSoloTournament && actualWinnerUserId && match.homeUser && match.awayUser) {
            // Solo match - update user ELO
            const winnerUser = actualWinnerUserId === match.homeUserId ? match.homeUser : match.awayUser;
            const loserUser = actualWinnerUserId === match.homeUserId ? match.awayUser : match.homeUser;

            const eloChange = calculateEloChange(winnerUser.elo, loserUser.elo);

            const updatedWinner = await prisma.user.update({
                where: { id: winnerUser.id },
                data: { elo: { increment: eloChange } },
            });

            // Web-Discord Sync: Elo
            const { webSyncService } = await import('../services/webSyncService.js');
            await webSyncService.onEloUpdate(updatedWinner.id, updatedWinner.elo);

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

        // Web-Discord Sync: Match Result
        const { webSyncService } = await import('../services/webSyncService.js');
        await webSyncService.onMatchResult(match.id);

        // Notify Discord Service
        const { discordService } = await import('../services/discordService.js');

        // Handle Proof Upload
        if (req.file) {
            const proofChannelId = match.tournament.discordChannelId || process.env.DISCORD_PROOF_CHANNEL_ID || '123456789'; // TODO: Get specific proof channel logic
            // User requested "az adott proof channelbe". If we don't have one, we might fallback to match channel or specific env.
            // I'll check if there is an env var for PROOF_CHANNEL, otherwise fallback to matches channel.

            const p1Val = match.homeUser?.displayName || match.homeTeam?.name || 'Home';
            const p2Val = match.awayUser?.displayName || match.awayTeam?.name || 'Away';

            // Try to get Discord IDs
            let homeDiscordId: string | null = null;
            let awayDiscordId: string | null = null;

            if (isSoloTournament) {
                homeDiscordId = match.homeUser?.discordId || null;
                awayDiscordId = match.awayUser?.discordId || null;
            } else {
                // For teams, we could potentially fetch the captain's discord ID, 
                // but for now we'll check if the team has a linked owner/captain with discordId
                // Assuming team structure has members, we'd need to fetch them.
                // The current query in `matches.ts` fetches homeTeam/awayTeam but not deep members.
                // However, we can use the homeUser/awayUser relations if they are set (often they are for teams too?)
                // Actually in 1v1 homeUser is set. In Team match homeTeamId is set.
                // Let's stick to what we have. If homeUser is present (solo), use it.
                if (match.homeUser?.discordId) homeDiscordId = match.homeUser.discordId;
                if (match.awayUser?.discordId) awayDiscordId = match.awayUser.discordId;
            }

            await discordService.sendMatchProof(
                req.file,
                {
                    tournamentName: match.tournament.name,
                    homeTeam: p1Val,
                    homeDiscordId,
                    awayTeam: p2Val,
                    awayDiscordId,
                    matchId: match.id,
                    uploaderName: user.displayName || user.username
                },
                proofChannelId
            );
        }

        // Send notifications if enabled
        if (match.tournament.notifyUsers || match.tournament.notifyDiscord) {
            // Import notification service
            const { notificationService } = await import('../services/notificationService.js');
            // discordService already imported above

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
                        // Calculate which lower bracket round and position the loser goes to
                        // Double Elimination Lower Bracket structure:
                        // - LR1: Upper R1 losers fight each other
                        // - LR2: LR1 winners fight Upper R2 losers
                        // - LR3: LR2 winners fight each other  
                        // - LR4: LR3 winners fight Upper R3 losers
                        // Pattern: Upper Round N (N>1) losers go to Lower Round 2*(N-1)
                        //          and they are placed in the AWAY slot (home is for LB advancing winners)

                        let lowerRound: number;
                        let lowerPosition: number;
                        let isHomeSlot: boolean;

                        if (match.round === 1) {
                            // Upper R1 losers: go to LR1, positions are halved
                            // Upper position 1,2 -> LR1 position 1; Upper 3,4 -> LR1 position 2
                            lowerRound = 1;
                            lowerPosition = Math.ceil(match.position / 2);
                            // Odd upper positions go to home, even go to away
                            isHomeSlot = match.position % 2 === 1;
                        } else {
                            // Upper R2+ losers: go to even numbered lower rounds
                            // They fight against LB advancing winners, so they go to AWAY slot
                            lowerRound = (match.round - 1) * 2;
                            // Position maps 1:1 since upper rounds have the same or fewer matches
                            lowerPosition = match.position;
                            // Upper bracket losers in later rounds go to AWAY slot
                            // (LB winners from previous round are in HOME slot)
                            isHomeSlot = false;
                        }

                        console.log(`🔽 Lower bracket drop: Upper R${match.round} P${match.position} -> Lower R${lowerRound} P${lowerPosition} (${isHomeSlot ? 'HOME' : 'AWAY'})`);

                        const lowerMatch = await prisma.match.findFirst({
                            where: {
                                tournamentId: match.tournamentId,
                                bracketType: 'LOWER',
                                round: lowerRound,
                                position: lowerPosition,
                            },
                        });

                        if (lowerMatch) {
                            // Check if the target slot is already occupied to prevent overwriting
                            const currentHomeOccupied = isSoloTournament ? lowerMatch.homeUserId : lowerMatch.homeTeamId;
                            const currentAwayOccupied = isSoloTournament ? lowerMatch.awayUserId : lowerMatch.awayTeamId;

                            console.log(`   Target match ${lowerMatch.id}: Home=${currentHomeOccupied || 'empty'}, Away=${currentAwayOccupied || 'empty'}`);

                            let updateData: any;
                            if (isHomeSlot && !currentHomeOccupied) {
                                // Prefer home slot if designated and free
                                updateData = isSoloTournament
                                    ? { homeUserId: loserId }
                                    : { homeTeamId: loserId };
                            } else if (!isHomeSlot && !currentAwayOccupied) {
                                // Prefer away slot if designated and free
                                updateData = isSoloTournament
                                    ? { awayUserId: loserId }
                                    : { awayTeamId: loserId };
                            } else if (!currentHomeOccupied) {
                                // Fallback to home if designated slot taken
                                updateData = isSoloTournament
                                    ? { homeUserId: loserId }
                                    : { homeTeamId: loserId };
                                console.log(`   ⚠️ Designated slot taken, using HOME instead`);
                            } else if (!currentAwayOccupied) {
                                // Fallback to away if home taken
                                updateData = isSoloTournament
                                    ? { awayUserId: loserId }
                                    : { awayTeamId: loserId };
                                console.log(`   ⚠️ Designated slot taken, using AWAY instead`);
                            } else {
                                // Both slots are occupied - this is an error state
                                console.error(`   ❌ ERROR: Lower bracket match ${lowerMatch.id} already has both participants filled!`);
                                // Don't update to avoid corrupting data
                            }

                            if (updateData) {
                                await prisma.match.update({
                                    where: { id: lowerMatch.id },
                                    data: updateData,
                                });
                                console.log(`   ✅ Loser placed successfully`);
                            }
                        } else {
                            console.error(`   ❌ ERROR: Could not find lower bracket match at R${lowerRound} P${lowerPosition}`);
                        }
                    }

                } else if (match.bracketType === 'LOWER') {
                    // Winner advances in lower bracket
                    const nextLowerRound = match.round + 1;

                    // Lower bracket structure:
                    // - Odd rounds (1, 3, 5...): After this, upper losers will join in even rounds
                    // - Even rounds (2, 4, 6...): Upper losers participate here
                    // Position calculation:
                    // - Even round winners: halve positions (consolidation)
                    // - Odd round winners: same position (upper losers will join as AWAY)
                    const nextPosition = match.round % 2 === 0
                        ? Math.ceil(match.position / 2)  // Even round: halve positions (consolidation)
                        : match.position;                // Odd round: same position

                    // Slot determination:
                    // - From odd rounds: LB winners go to HOME (upper losers will come as AWAY)
                    // - From even rounds: consolidated winners, odd pos -> HOME, even pos -> AWAY
                    const isHomeSlot = match.round % 2 === 1
                        ? true                           // Odd rounds: always HOME (upper losers will be AWAY)
                        : match.position % 2 === 1;      // Even rounds: odd pos -> home

                    console.log(`🔼 Lower bracket advance: LR${match.round} P${match.position} -> LR${nextLowerRound} P${nextPosition} (${isHomeSlot ? 'HOME' : 'AWAY'})`);

                    const nextLowerMatch = await prisma.match.findFirst({
                        where: {
                            tournamentId: match.tournamentId,
                            bracketType: 'LOWER',
                            round: nextLowerRound,
                            position: nextPosition,
                        },
                    });

                    if (nextLowerMatch) {
                        // Check current occupancy to avoid overwriting
                        const currentHomeOccupied = isSoloTournament ? nextLowerMatch.homeUserId : nextLowerMatch.homeTeamId;
                        const currentAwayOccupied = isSoloTournament ? nextLowerMatch.awayUserId : nextLowerMatch.awayTeamId;

                        console.log(`   Target match ${nextLowerMatch.id}: Home=${currentHomeOccupied || 'empty'}, Away=${currentAwayOccupied || 'empty'}`);

                        let updateData: any;
                        if (isHomeSlot && !currentHomeOccupied) {
                            updateData = isSoloTournament
                                ? { homeUserId: actualWinnerUserId }
                                : { homeTeamId: actualWinnerId };
                        } else if (!isHomeSlot && !currentAwayOccupied) {
                            updateData = isSoloTournament
                                ? { awayUserId: actualWinnerUserId }
                                : { awayTeamId: actualWinnerId };
                        } else if (!currentHomeOccupied) {
                            updateData = isSoloTournament
                                ? { homeUserId: actualWinnerUserId }
                                : { homeTeamId: actualWinnerId };
                            console.log(`   ⚠️ Designated slot taken, using HOME instead`);
                        } else if (!currentAwayOccupied) {
                            updateData = isSoloTournament
                                ? { awayUserId: actualWinnerUserId }
                                : { awayTeamId: actualWinnerId };
                            console.log(`   ⚠️ Designated slot taken, using AWAY instead`);
                        } else {
                            console.error(`   ❌ ERROR: Lower bracket match ${nextLowerMatch.id} already has both participants filled!`);
                        }

                        if (updateData) {
                            await prisma.match.update({
                                where: { id: nextLowerMatch.id },
                                data: updateData,
                            });
                            console.log(`   ✅ Winner advanced successfully`);
                        }
                    } else {
                        // Lower bracket final - winner goes to grand final
                        console.log(`🏆 Lower bracket winner going to Grand Final`);
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
                            console.log(`   ✅ Lower bracket champion placed in Grand Final (AWAY)`);
                        } else {
                            console.error(`   ❌ ERROR: Could not find Grand Final match!`);
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
            include: { homeTeam: true, awayTeam: true, homeUser: true, awayUser: true }
        });

        // Log schedule update
        const p1 = match.homeUser?.username || match.homeTeam?.name || 'Home';
        const p2 = match.awayUser?.username || match.awayTeam?.name || 'Away';
        await logSystemActivity(
            'MATCH_SCHEDULE',
            `Match ${p1} vs ${p2} scheduled to ${match.scheduledAt?.toLocaleString()} by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    matchId: match.id,
                    scheduledAt: match.scheduledAt,
                    tournamentId: match.tournamentId
                }
            }
        );

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

// Reset match result (admin only) - clears winner, scores, and status back to PENDING
matchesRouter.patch(
    '/:id/reset',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Csak adminisztrátorok resetelhetik a meccseket', 403, 'FORBIDDEN');
        }

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

        const isSoloTournament = match.tournament.game?.teamSize === 1;

        // If match had a winner, we may need to undo ELO changes
        // Note: This is a simplified approach - in production you'd want to track ELO history
        const hadResult = match.status === 'COMPLETED' && (match.winnerId || match.winnerUserId);

        // Reset the match
        const updatedMatch = await prisma.match.update({
            where: { id: req.params.id },
            data: {
                homeScore: null,
                awayScore: null,
                winnerId: null,
                winnerUserId: null,
                status: 'PENDING',
                playedAt: null,
            },
            include: {
                homeTeam: true,
                awayTeam: true,
                homeUser: true,
                awayUser: true,
            },
        });

        // Log the reset
        const p1 = match.homeUser?.username || match.homeTeam?.name || 'Home';
        const p2 = match.awayUser?.username || match.awayTeam?.name || 'Away';
        await logSystemActivity(
            'MATCH_RESET',
            `Match reset: ${p1} vs ${p2} in ${match.tournament.name}`,
            {
                userId: user.id,
                metadata: {
                    matchId: match.id,
                    tournamentId: match.tournamentId,
                    tournamentName: match.tournament.name,
                    previousResult: {
                        homeScore: match.homeScore,
                        awayScore: match.awayScore,
                        winnerId: match.winnerId,
                        winnerUserId: match.winnerUserId
                    }
                }
            }
        );

        // TODO: Consider removing winner from next round match if they've been placed there
        // This is complex and could be implemented as a separate "cascade reset" feature

        res.json({
            success: true,
            data: updatedMatch,
            message: hadResult
                ? 'Meccs resetelve. Figyelem: Az ELO változások nem lettek automatikusan visszavonva.'
                : 'Meccs resetelve.'
        });
    })
);

// Delete match (admin only)
matchesRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Csak adminisztrátorok törölhetnek meccseket', 403, 'FORBIDDEN');
        }

        const match = await prisma.match.findUnique({
            where: { id: req.params.id },
            include: {
                homeTeam: true,
                awayTeam: true,
                homeUser: true,
                awayUser: true,
                tournament: true,
            },
        });

        if (!match) {
            throw new ApiError('A meccs nem található', 404, 'NOT_FOUND');
        }

        // Instead of hard deleting, we clear the match data (participants, scores, status)
        // enabling the bracket structure to remain intact.
        const updatedMatch = await prisma.match.update({
            where: { id: req.params.id },
            data: {
                homeTeamId: null,
                awayTeamId: null,
                homeUserId: null,
                awayUserId: null,
                homeScore: null,
                awayScore: null,
                winnerId: null,
                winnerUserId: null,
                status: 'PENDING',
                playedAt: null,
            },
            include: {
                tournament: {
                    include: {
                        game: true,
                    },
                },
            },
        });

        // Log the clearing
        const p1 = match.homeUser?.username || match.homeTeam?.name || 'Home';
        const p2 = match.awayUser?.username || match.awayTeam?.name || 'Away';
        await logSystemActivity(
            'MATCH_CLEARED',
            `Match cleared (participants removed): ${p1} vs ${p2} in ${match.tournament.name}`,
            {
                userId: user.id,
                metadata: {
                    matchId: match.id,
                    tournamentId: match.tournamentId,
                    tournamentName: match.tournament.name,
                    bracketType: match.bracketType,
                    round: match.round,
                    position: match.position
                }
            }
        );

        res.json({
            success: true,
            message: 'Meccs adatok törölve (a bracket hely megmaradt)',
            data: updatedMatch
        });
    })
);
