import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getFederatedIdentities } from '../utils/keycloak-admin.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';
import { notificationService } from '../services/notificationService.js';

export const tournamentsRouter = Router();

// Get all tournaments
tournamentsRouter.get(
    '/',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { status, gameId, page = '1', limit = '10' } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (gameId) where.gameId = gameId;

        const tournaments = await prisma.tournament.findMany({
            where,
            include: {
                game: true,
                _count: { select: { entries: true, matches: true } },
            },
            orderBy: { startDate: 'asc' },
            skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            take: parseInt(limit as string),
        });

        const total = await prisma.tournament.count({ where });

        res.json({
            success: true,
            data: tournaments,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    })
);

// Create tournament (organizer+)
tournamentsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők hozhatnak létre versenyt', 403, 'FORBIDDEN');
        }

        const {
            name,
            description,
            imageUrl,
            gameId,
            format,
            maxTeams,
            startDate,
            endDate,
            registrationDeadline,
            hasQualifier,
            qualifierMatches,
            qualifierMinPoints,
            teamSize,
        } = req.body;

        if (!name || !gameId || !maxTeams || !startDate || !registrationDeadline) {
            throw new ApiError('Missing required fields', 400, 'MISSING_FIELDS');
        }

        // Verify game exists
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            throw new ApiError('Game not found', 404, 'GAME_NOT_FOUND');
        }

        // Process image if base64
        let processedImageUrl = imageUrl;
        if (imageUrl && isBase64DataUrl(imageUrl)) {
            if (!validateImageSize(imageUrl, 150)) {
                throw new ApiError('A kép túl nagy (max 150KB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedImageUrl = await processImage(imageUrl);
        }

        const tournament = await prisma.tournament.create({
            data: {
                name,
                description,
                imageUrl: processedImageUrl,
                gameId,
                format: format || 'SINGLE_ELIMINATION',
                maxTeams,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                registrationDeadline: new Date(registrationDeadline),
                hasQualifier: hasQualifier || false,
                qualifierMatches: qualifierMatches ? parseInt(qualifierMatches) : 0,
                qualifierMinPoints: qualifierMinPoints ? parseInt(qualifierMinPoints) : 0,
                status: 'DRAFT',
                teamSize: teamSize ? parseInt(teamSize) : null,
            },
            include: { game: true },
        });

        // Notify all users (async, don't await)
        notificationService.notifyAllUsersNewTournament(tournament)
            .catch(err => console.error('Failed to broadcast tournament notification:', err));

        res.status(201).json({ success: true, data: tournament });
    })
);

// Get tournament by ID
tournamentsRouter.get(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: {
                game: true,
                entries: {
                    include: {
                        team: {
                            include: {
                                members: {
                                    include: {
                                        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                                    },
                                },
                            },
                        },
                        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
                    },
                    orderBy: { seed: 'asc' },
                },
                matches: {
                    include: {
                        homeTeam: { select: { id: true, name: true, logoUrl: true } },
                        awayTeam: { select: { id: true, name: true, logoUrl: true } },
                        winner: { select: { id: true, name: true } },
                        homeUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
                        awayUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
                        winnerUser: { select: { id: true, username: true, displayName: true } },
                    },
                    orderBy: [{ round: 'asc' }, { position: 'asc' }],
                },
                _count: { select: { entries: true } },
            },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: tournament });
    })
);

// Delete tournament (organizer+)
tournamentsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők törölhetnek versenyt', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        // Add cascade delete logic if needed, but Prisma usually handles it if schema is configured
        // Assuming schema has onDelete: Cascade for relations or we need to delete manually
        // Based on typical Prisma usage with relations defined in schema.
        await prisma.tournament.delete({
            where: { id: req.params.id },
        });

        res.json({ success: true, message: 'Tournament deleted' });
    })
);

// Update tournament
tournamentsRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők módosíthatnak versenyt', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        const {
            name,
            description,
            imageUrl,
            status,
            format,
            maxTeams,
            startDate,
            endDate,
            registrationDeadline,
            notifyUsers,
            notifyDiscord,
            discordChannelId,
            hasQualifier,
            qualifierMatches,
            qualifierMinPoints,
            teamSize,
        } = req.body;

        // Process image if base64
        let processedImageUrl = imageUrl;
        if (imageUrl && isBase64DataUrl(imageUrl)) {
            if (!validateImageSize(imageUrl, 150)) {
                throw new ApiError('A kép túl nagy (max 10MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedImageUrl = await processImage(imageUrl);
        }

        const updated = await prisma.tournament.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(processedImageUrl !== undefined && { imageUrl: processedImageUrl }),
                ...(status && { status }),
                ...(format && { format }),
                ...(maxTeams && { maxTeams }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(registrationDeadline && { registrationDeadline: new Date(registrationDeadline) }),
                ...(notifyUsers !== undefined && { notifyUsers }),
                ...(notifyDiscord !== undefined && { notifyDiscord }),
                ...(discordChannelId !== undefined && { discordChannelId }),
                ...(hasQualifier !== undefined && { hasQualifier }),
                ...(qualifierMatches !== undefined && { qualifierMatches: parseInt(qualifierMatches) }),
                ...(qualifierMinPoints !== undefined && { qualifierMinPoints: parseInt(qualifierMinPoints) }),
                ...(teamSize !== undefined && { teamSize: teamSize ? parseInt(teamSize) : null }),
            },
            include: {
                game: true,
                _count: { select: { entries: true } },
            },
        });

        res.json({ success: true, data: updated });
    })
);

// Register team for tournament
tournamentsRouter.post(
    '/:id/register',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { teamId } = req.body;

        if (!teamId) {
            throw new ApiError('Csapat azonosító szükséges', 400, 'MISSING_TEAM_ID');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { entries: true } } },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        if (tournament.status !== 'REGISTRATION') {
            throw new ApiError('A versenyre jelenleg nem lehet regisztrálni', 400, 'REGISTRATION_CLOSED');
        }

        // if (new Date() > tournament.registrationDeadline) {
        //     throw new ApiError('Registration deadline has passed', 400, 'DEADLINE_PASSED');
        // }

        if (tournament._count.entries >= tournament.maxTeams) {
            throw new ApiError('A verseny megtelt', 400, 'TOURNAMENT_FULL');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Check if user is captain of the team
        const team = await prisma.team.findUnique({
            where: { id: teamId },
        });

        if (!team) {
            throw new ApiError('Csapat nem található', 404, 'TEAM_NOT_FOUND');
        }

        if (team.ownerId !== user.id) {
            throw new ApiError('Csak a csapatkapitány regisztrálhat versenyre', 403, 'NOT_CAPTAIN');
        }

        // Check if already registered
        const existingEntry = await prisma.tournamentEntry.findUnique({
            where: { tournamentId_teamId: { tournamentId: req.params.id, teamId } },
        });

        if (existingEntry) {
            throw new ApiError('A csapat már részt vett ebben a tornácsonyban', 400, 'ALREADY_REGISTERED');
        }

        const entry = await prisma.tournamentEntry.create({
            data: {
                tournamentId: req.params.id,
                teamId,
                seed: team.elo, // Initial seed based on ELO
            },
            include: { team: true, tournament: true },
        });

        res.status(201).json({ success: true, data: entry });
    })
);

// Unregister team from tournament
tournamentsRouter.delete(
    '/:id/register/:teamId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        if (tournament.status !== 'REGISTRATION' && tournament.status !== 'DRAFT') {
            throw new ApiError('A verseny kezdete után nem lehet leiratkozni', 400, 'CANNOT_UNREGISTER');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const team = await prisma.team.findUnique({
            where: { id: req.params.teamId },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'TEAM_NOT_FOUND');
        }

        // Check if user is captain or admin
        if (team.ownerId !== user.id && user.role !== 'ADMIN') {
            throw new ApiError('Only team captain can unregister', 403, 'NOT_CAPTAIN');
        }

        await prisma.tournamentEntry.delete({
            where: { tournamentId_teamId: { tournamentId: req.params.id, teamId: req.params.teamId } },
        });

        res.json({ success: true, message: 'Team unregistered' });
    })
);

// Generate bracket for tournament (organizer+)
tournamentsRouter.post(
    '/:id/generate-bracket',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők generálhatnak ágrajzot', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: {
                game: true,
                entries: {
                    include: {
                        team: true,
                        user: true,
                    },
                    orderBy: { seed: 'asc' },
                },
            },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        if (tournament.entries.length < 2) {
            throw new ApiError('Legalább 2 résztvevő szükséges', 400, 'NOT_ENOUGH_PARTICIPANTS');
        }

        // Delete existing matches
        await prisma.match.deleteMany({ where: { tournamentId: tournament.id } });

        // Check if this is a solo (1v1) tournament
        // Prioritize tournament.teamSize if set, otherwise fallback to game.teamSize, otherwise default to 1 (solo)
        const teamSize = tournament.teamSize ?? tournament.game?.teamSize ?? 1;
        const isSoloTournament = teamSize === 1;
        const matches: any[] = [];

        if (tournament.format === 'ROUND_ROBIN') {
            // ==========================================
            // ROUND ROBIN GENERATION (Berger Tables / Circle Method)
            // ==========================================

            // 1. Prepare participants array (handling odd number with dummy)
            let participants = [...tournament.entries];
            if (participants.length % 2 !== 0) {
                participants.push(null as any); // Dummy participant for bye
            }

            const n = participants.length;
            const numRounds = n - 1;
            const matchesPerRound = n / 2;

            for (let round = 0; round < numRounds; round++) {
                for (let i = 0; i < matchesPerRound; i++) {
                    const homeIdx = i;
                    const awayIdx = n - 1 - i;

                    const homeEntry = participants[homeIdx];
                    const awayEntry = participants[awayIdx];

                    // If either is null, it's a bye round for the other
                    if (!homeEntry || !awayEntry) continue;

                    matches.push({
                        tournamentId: tournament.id,
                        round: round + 1,
                        position: i + 1,
                        bracketType: 'UPPER', // Use UPPER as default for group matches
                        // Team fields
                        homeTeamId: isSoloTournament ? null : (homeEntry.team?.id || null),
                        awayTeamId: isSoloTournament ? null : (awayEntry.team?.id || null),
                        // User fields
                        homeUserId: isSoloTournament ? (homeEntry.user?.id || null) : null,
                        awayUserId: isSoloTournament ? (awayEntry.user?.id || null) : null,
                        status: 'PENDING',
                    });
                }

                // Rotate participants array (keep index 0 fixed)
                // [0, 1, 2, 3] -> [0, 3, 1, 2] -> [0, 2, 3, 1] ...
                const movingPart = participants.pop();
                if (movingPart !== undefined) {
                    participants.splice(1, 0, movingPart);
                }
            }

        } else if (tournament.format === 'DOUBLE_ELIMINATION') {
            // ==========================================
            // DOUBLE ELIMINATION BRACKET
            // ==========================================
            const numParticipants = tournament.entries.length;
            const numRounds = Math.ceil(Math.log2(numParticipants));
            const bracketSize = Math.pow(2, numRounds);

            const seededEntries: (typeof tournament.entries[0] | null)[] = [];
            for (let i = 0; i < bracketSize; i++) {
                seededEntries.push(tournament.entries[i] || null);
            }

            // Create upper bracket matches (same as single elimination)
            const firstRoundMatches = bracketSize / 2;

            for (let i = 0; i < firstRoundMatches; i++) {
                const homeEntry = seededEntries[i];
                const awayEntry = seededEntries[bracketSize - 1 - i];

                matches.push({
                    tournamentId: tournament.id,
                    round: 1,
                    position: i + 1,
                    bracketType: 'UPPER',
                    // Team fields (for team tournaments)
                    homeTeamId: isSoloTournament ? null : (homeEntry?.team?.id || null),
                    awayTeamId: isSoloTournament ? null : (awayEntry?.team?.id || null),
                    // User fields (for solo tournaments)
                    homeUserId: isSoloTournament ? (homeEntry?.user?.id || null) : null,
                    awayUserId: isSoloTournament ? (awayEntry?.user?.id || null) : null,
                    status: 'PENDING',
                    // Auto-advance if bye
                    winnerId: !isSoloTournament ? (!homeEntry ? awayEntry?.team?.id : !awayEntry ? homeEntry?.team?.id : null) : null,
                    winnerUserId: isSoloTournament ? (!homeEntry ? awayEntry?.user?.id : !awayEntry ? homeEntry?.user?.id : null) : null,
                });
            }

            // Create subsequent upper bracket rounds
            let matchesInRound = firstRoundMatches / 2;
            for (let round = 2; round <= numRounds; round++) {
                for (let pos = 1; pos <= matchesInRound; pos++) {
                    matches.push({
                        tournamentId: tournament.id,
                        round,
                        position: pos,
                        bracketType: 'UPPER',
                        homeTeamId: null,
                        awayTeamId: null,
                        status: 'PENDING',
                    });
                }
                matchesInRound = matchesInRound / 2;
            }

            // Create lower bracket rounds
            // Lower bracket has (2 * numRounds - 2) rounds for a standard double elim
            // Each upper bracket match creates a loser that drops to lower bracket
            const lowerBracketRounds = numRounds > 1 ? (numRounds - 1) * 2 : 1;

            // Lower round 1: receives losers from upper round 1
            let lowerMatchesInRound = firstRoundMatches / 2;
            for (let lowerRound = 1; lowerRound <= lowerBracketRounds; lowerRound++) {
                for (let pos = 1; pos <= lowerMatchesInRound; pos++) {
                    matches.push({
                        tournamentId: tournament.id,
                        round: lowerRound,
                        position: pos,
                        bracketType: 'LOWER',
                        homeTeamId: null,
                        awayTeamId: null,
                        status: 'PENDING',
                    });
                }
                // Every 2 lower rounds, halve the matches
                if (lowerRound % 2 === 0) {
                    lowerMatchesInRound = Math.max(1, lowerMatchesInRound / 2);
                }
            }

            // Create Grand Final match
            matches.push({
                tournamentId: tournament.id,
                round: 1,
                position: 1,
                bracketType: 'GRAND_FINAL',
                homeTeamId: null, // Upper bracket winner
                awayTeamId: null, // Lower bracket winner
                status: 'PENDING',
            });

        } else {
            // ==========================================
            // SINGLE ELIMINATION BRACKET (default)
            // ==========================================
            const numParticipants = tournament.entries.length;
            const numRounds = Math.ceil(Math.log2(numParticipants));
            const bracketSize = Math.pow(2, numRounds);

            const seededEntries: (typeof tournament.entries[0] | null)[] = [];
            for (let i = 0; i < bracketSize; i++) {
                seededEntries.push(tournament.entries[i] || null);
            }

            const firstRoundMatches = bracketSize / 2;

            for (let i = 0; i < firstRoundMatches; i++) {
                const homeEntry = seededEntries[i];
                const awayEntry = seededEntries[bracketSize - 1 - i];

                matches.push({
                    tournamentId: tournament.id,
                    round: 1,
                    position: i + 1,
                    bracketType: 'UPPER',
                    // Team fields (for team tournaments)
                    homeTeamId: isSoloTournament ? null : (homeEntry?.team?.id || null),
                    awayTeamId: isSoloTournament ? null : (awayEntry?.team?.id || null),
                    // User fields (for solo tournaments)
                    homeUserId: isSoloTournament ? (homeEntry?.user?.id || null) : null,
                    awayUserId: isSoloTournament ? (awayEntry?.user?.id || null) : null,
                    status: 'PENDING',
                    // Auto-advance if bye
                    winnerId: !isSoloTournament ? (!homeEntry ? awayEntry?.team?.id : !awayEntry ? homeEntry?.team?.id : null) : null,
                    winnerUserId: isSoloTournament ? (!homeEntry ? awayEntry?.user?.id : !awayEntry ? homeEntry?.user?.id : null) : null,
                });
            }

            // Create subsequent rounds (empty for now)
            let matchesInRound = firstRoundMatches / 2;
            for (let round = 2; round <= numRounds; round++) {
                for (let pos = 1; pos <= matchesInRound; pos++) {
                    matches.push({
                        tournamentId: tournament.id,
                        round,
                        position: pos,
                        bracketType: 'UPPER',
                        homeTeamId: null,
                        awayTeamId: null,
                        status: 'PENDING',
                    });
                }
                matchesInRound = matchesInRound / 2;
            }
        }

        await prisma.match.createMany({ data: matches });

        // Update tournament status
        await prisma.tournament.update({
            where: { id: tournament.id },
            data: { status: 'IN_PROGRESS' },
        });

        const createdMatches = await prisma.match.findMany({
            where: { tournamentId: tournament.id },
            include: {
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
                homeUser: { select: { id: true, username: true, displayName: true } },
                awayUser: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ bracketType: 'asc' }, { round: 'asc' }, { position: 'asc' }],
        });

        // Auto-advance byes (matches with only one participant) - ONLY FOR ELIMINATION FORMATS
        if (tournament.format !== 'ROUND_ROBIN') {
            console.log('🔄 Processing automatic byes...');
            for (const match of createdMatches) {
                const isSoloMatch = !!(match.homeUserId || match.awayUserId);
                const hasHome = isSoloMatch ? !!match.homeUserId : !!match.homeTeamId;
                const hasAway = isSoloMatch ? !!match.awayUserId : !!match.awayTeamId;

                // If only one participant, auto-advance them
                if ((hasHome && !hasAway) || (!hasHome && hasAway)) {
                    const winnerId = hasHome ? (isSoloMatch ? match.homeUserId : match.homeTeamId) : (isSoloMatch ? match.awayUserId : match.awayTeamId);

                    console.log(`✅ Auto-advancing bye in match ${match.id}, round ${match.round}, position ${match.position}`);

                    // Mark match as completed with winner
                    await prisma.match.update({
                        where: { id: match.id },
                        data: {
                            status: 'COMPLETED',
                            ...(isSoloMatch ? { winnerUserId: winnerId } : { winnerId }),
                            playedAt: new Date(),
                        },
                    });

                    // Advance to next round
                    const nextRound = match.round + 1;
                    const nextPosition = Math.ceil(match.position / 2);
                    const isHomeSlot = match.position % 2 === 1;

                    const nextMatch = await prisma.match.findFirst({
                        where: {
                            tournamentId: tournament.id,
                            round: nextRound,
                            position: nextPosition,
                            bracketType: match.bracketType || 'UPPER',
                        },
                    });

                    if (nextMatch) {
                        console.log(`  ➡️ Advancing to round ${nextRound}, position ${nextPosition}, slot: ${isHomeSlot ? 'home' : 'away'}`);
                        await prisma.match.update({
                            where: { id: nextMatch.id },
                            data: isSoloMatch
                                ? (isHomeSlot ? { homeUserId: winnerId } : { awayUserId: winnerId })
                                : (isHomeSlot ? { homeTeamId: winnerId } : { awayTeamId: winnerId }),
                        });
                    }
                }
            }
        }

        // Fetch final state after bye processing
        const finalMatches = await prisma.match.findMany({
            where: { tournamentId: tournament.id },
            include: {
                homeTeam: { select: { id: true, name: true, logoUrl: true } },
                awayTeam: { select: { id: true, name: true, logoUrl: true } },
                homeUser: { select: { id: true, username: true, displayName: true } },
                awayUser: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ bracketType: 'asc' }, { round: 'asc' }, { position: 'asc' }],
        });

        res.json({ success: true, data: finalMatches });
    })
);

// Update tournament entry stats (qualifier points, matches played)
tournamentsRouter.patch(
    '/:id/entries/:entryId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Csak szervezők frissíthetik a statisztikákat', 403, 'FORBIDDEN');
        }

        const { matchesPlayed, qualifierPoints } = req.body;

        // Ensure the entry belongs to the specified tournament before updating
        const existingEntry = await prisma.tournamentEntry.findFirst({
            where: {
                id: req.params.entryId,
                tournamentId: req.params.id,
            },
        });

        if (!existingEntry) {
            throw new ApiError('Nevezés nem található ehhez a versenyhez', 404, 'NOT_FOUND');
        }
        const updatedEntry = await prisma.tournamentEntry.update({
            where: { id: req.params.entryId },
            data: {
                ...(matchesPlayed !== undefined && { matchesPlayed: parseInt(matchesPlayed) }),
                ...(qualifierPoints !== undefined && { qualifierPoints: parseInt(qualifierPoints) }),
            },
            include: {
                team: {
                    include: {
                        members: {
                            include: {
                                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                            },
                        },
                    },
                },
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
            },
        });

        res.json({ success: true, data: updatedEntry });
    })
);
