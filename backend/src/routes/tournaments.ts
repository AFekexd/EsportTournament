import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { getFederatedIdentities } from '../utils/keycloak-admin.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';
import { notificationService } from '../services/notificationService.js';
import { UserRole, TournamentStatus } from '../utils/enums.js';
import { tournamentService } from '../services/tournamentService.js';

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

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole)) {
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
            requireRank,
            seedingMethod,
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
                qualifierMatches: qualifierMatches ? parseInt(qualifierMatches) : undefined,
                qualifierMinPoints: qualifierMinPoints ? parseInt(qualifierMinPoints) : undefined,
                status: TournamentStatus.DRAFT,
                teamSize: teamSize ? parseInt(teamSize) : undefined,
                requireRank: requireRank !== undefined ? requireRank : undefined,
                seedingMethod: seedingMethod || 'STANDARD',
            },
            include: { game: true },
        });

        // Log creation
        await logSystemActivity(
            'TOURNAMENT_CREATE',
            `Tournament '${tournament.name}' created by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    tournamentId: tournament.id,
                    gameId: tournament.gameId,
                    format: tournament.format,
                    startDate: tournament.startDate
                }
            }
        );

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

        // Robust counting: Count unique teams (for team tournaments) or participants (for solo)
        let participantsCount = tournament._count.entries;

        // If it's a team tournament (has teamSize > 1 or game.teamSize > 1), ensure we count unique teams
        const teamSize = tournament.teamSize ?? tournament.game?.teamSize ?? 1;
        if (teamSize > 1) {
            const uniqueTeams = new Set(tournament.entries.map(e => e.teamId).filter(Boolean));
            participantsCount = uniqueTeams.size;
        }

        res.json({
            success: true,
            data: {
                ...tournament,
                participantsCount // Explicitly return the calculated count
            }
        });
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

        if (!user || user.role !== UserRole.ADMIN && user.role !== UserRole.ORGANIZER) {
            throw new ApiError('Csak adminisztrátorok és organizátorok törölhetnek versenyt', 403, 'FORBIDDEN');
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

        // Log deletion
        await logSystemActivity(
            'TOURNAMENT_DELETE',
            `Tournament ID ${req.params.id} deleted by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    tournamentId: req.params.id,
                    deletedBy: user.username
                }
            }
        );

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

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole)) {
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
            requireRank,
            seedingMethod,
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
                ...(requireRank !== undefined && { requireRank }),
                ...(seedingMethod && { seedingMethod }),
            },
            include: {
                game: true,
                _count: { select: { entries: true } },
            },
        });

        // Log update
        await logSystemActivity(
            'TOURNAMENT_UPDATE',
            `Tournament '${updated.name}' updated by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    tournamentId: updated.id,
                    changes: Object.keys(req.body).filter(k => k !== 'imageUrl'),
                    status: updated.status
                }
            }
        );

        res.json({ success: true, data: updated });
    })
);

// Register team or user for tournament
tournamentsRouter.post(
    '/:id/register',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { teamId, memberIds, userId: targetUserId } = req.body;

        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const entry = await tournamentService.register({
            tournamentId: req.params.id,
            userId: targetUserId,
            teamId,
            memberIds,
            registrantUser: currentUser
        });

        // Log registration function wrapped to handle potential async issues if needed, but service handles standard logging? 
        // Service doesn't log, so we keep logging here.
        await logSystemActivity(
            'TOURNAMENT_REGISTER',
            `Registration for tournament ID '${req.params.id}'`,
            {
                userId: currentUser.id,
                metadata: {
                    tournamentId: req.params.id,
                    registeredBy: currentUser.username,
                    isTeam: !!entry.teamId,
                    registrantId: entry.teamId || entry.userId,
                    participantCount: entry.participants ? entry.participants.length : 1
                }
            }
        );

        res.status(201).json({ success: true, data: entry });
    })
);

// Unregister from tournament (Team or User)
tournamentsRouter.delete(
    '/:id/register/:targetId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { game: true }
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Try to find entry by ID first (more robust)
        const targetId = req.params.targetId;
        const entryById = await prisma.tournamentEntry.findUnique({
            where: { id: targetId },
            include: { team: true, user: true }
        });

        if (entryById) {
            if (entryById.tournamentId !== tournament.id) {
                // Entry exists but belongs to another tournament?
                // Depending on security model, we might throw 404 or 400.
                // Or just fall through to existing logic.
                // Let's ignore it here and let fallback handle it or just error.
            } else {
                // Check Permissions for Entry ID deletion
                let isAllowed = false;
                if (['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                    isAllowed = true;
                } else if (entryById.userId === currentUser.id) {
                    // Self unregister
                    isAllowed = true;
                } else if (entryById.teamId && entryById.team?.ownerId === currentUser.id) {
                    // Team Captain unregister
                    isAllowed = true;
                }

                if (!isAllowed) {
                    throw new ApiError('Nincs jogosultságod a nevezés törlésére', 403, 'FORBIDDEN');
                }

                // Check Status (if not admin)
                if (!['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                    if (tournament.status !== 'REGISTRATION') {
                        throw new ApiError('A verseny kezdete után nem lehet leiratkozni', 400, 'CANNOT_UNREGISTER');
                    }
                }

                await prisma.tournamentEntry.delete({ where: { id: entryById.id } });

                // Log unregister
                await logSystemActivity(
                    'TOURNAMENT_UNREGISTER',
                    `Unregistration from tournament '${tournament.name}' (Entry ID)`,
                    {
                        userId: currentUser.id,
                        metadata: {
                            tournamentId: tournament.id,
                            entryId: entryById.id,
                            unregisteredBy: currentUser.username
                        }
                    }
                );

                return res.json({ success: true, message: 'Sikeres leiratkozás' });
            }
        }

        // Determine tournament type (Fallback to old logic if not Entry ID)
        const teamSize = tournament.teamSize ?? tournament.game?.teamSize ?? 1;
        const isSolo = teamSize === 1;

        if (isSolo) {
            // ==========================================
            // SOLO UNREGISTRATION (1v1)
            // ==========================================
            const targetUserId = req.params.targetId;

            // Permission Check
            if (targetUserId !== currentUser.id && !['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                throw new ApiError('Csak a saját regisztrációdat törölheted', 403, 'FORBIDDEN');
            }

            // Check if entry exists
            const entry = await prisma.tournamentEntry.findUnique({
                where: { tournamentId_userId: { tournamentId: req.params.id, userId: targetUserId } }
            });

            if (!entry) {
                throw new ApiError('Nem vagy regisztrálva erre a versenyre', 404, 'ENTRY_NOT_FOUND');
            }

            // Allow unregistering if DRAFT, REGISTRATION. 
            // Admins can unregister anytime? Maybe not IN_PROGRESS unless force?
            // User can only unregister during REGISTRATION.
            if (!['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                if (tournament.status !== 'REGISTRATION') {
                    throw new ApiError('A verseny kezdete után nem lehet leiratkozni', 400, 'CANNOT_UNREGISTER');
                }
            }

            await prisma.tournamentEntry.delete({
                where: { id: entry.id }
            });

            // Log unregister
            await logSystemActivity(
                'TOURNAMENT_UNREGISTER',
                `User ${targetUserId} unregistered from tournament '${tournament.name}'`,
                {
                    userId: currentUser.id,
                    metadata: {
                        tournamentId: tournament.id,
                        targetUserId,
                        unregisteredBy: currentUser.username
                    }
                }
            );

        } else {
            // ==========================================
            // TEAM UNREGISTRATION (>1)
            // ==========================================
            const targetTeamId = req.params.targetId;

            const team = await prisma.team.findUnique({
                where: { id: targetTeamId },
            });

            if (!team) {
                throw new ApiError('Csapat nem található', 404, 'TEAM_NOT_FOUND');
            }

            // Check permissions
            if (team.ownerId !== currentUser.id && !['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                throw new ApiError('Csak a csapatkapitány vagy szervező törölheti a regisztrációt', 403, 'NOT_CAPTAIN');
            }

            const entry = await prisma.tournamentEntry.findUnique({
                where: { tournamentId_teamId: { tournamentId: req.params.id, teamId: targetTeamId } }
            });

            if (!entry) {
                throw new ApiError('Ez a csapat nincs regisztrálva erre a versenyre', 404, 'ENTRY_NOT_FOUND');
            }

            if (!['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
                if (tournament.status !== 'REGISTRATION') {
                    throw new ApiError('A verseny kezdete után nem lehet leiratkozni', 400, 'CANNOT_UNREGISTER');
                }
            }

            await prisma.tournamentEntry.delete({
                where: { id: entry.id },
            });

            // Log unregister
            await logSystemActivity(
                'TOURNAMENT_UNREGISTER',
                `Team ${targetTeamId} unregistered from tournament '${tournament.name}'`,
                {
                    userId: currentUser.id,
                    metadata: {
                        tournamentId: tournament.id,
                        targetTeamId,
                        unregisteredBy: currentUser.username
                    }
                }
            );
        }

        res.json({ success: true, message: 'Sikeres leiratkozás' });
    })
);

// Delete bracket (organizer+)
tournamentsRouter.delete(
    '/:id/bracket',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole)) {
            throw new ApiError('Csak szervezők törölhetik az ágrajzot', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { matches: true }
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        if (tournament.matches.length === 0) {
            throw new ApiError('Nincs törölhető ágrajz', 400, 'NO_BRACKET_TO_DELETE');
        }

        await tournamentService.deleteBracket(req.params.id);

        await logSystemActivity(
            'BRACKET_DELETE',
            `Bracket deleted for tournament '${tournament.name}' by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    tournamentId: tournament.id,
                    deletedBy: user.username
                }
            }
        );

        res.json({ success: true, message: 'Ágrajz sikeresen törölve' });
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

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole)) {
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
                    orderBy: [{ seed: 'desc' }, { registeredAt: 'asc' }],
                },
            },
        });

        if (!tournament) {
            throw new ApiError('A verseny nem található', 404, 'NOT_FOUND');
        }

        // Filter for Qualified Players if applicable
        let entries = tournament.entries;
        if (tournament.hasQualifier && tournament.qualifierMinPoints) {
            entries = entries.filter(e => (e.qualifierPoints || 0) >= (tournament.qualifierMinPoints || 0));
            // Re-sort by qualifier points descending for seeding purposes
            entries.sort((a, b) => (b.qualifierPoints || 0) - (a.qualifierPoints || 0));
        } else if (tournament.seedingMethod === 'RANDOM') {
            // Shuffle entries
            entries = entries.sort(() => Math.random() - 0.5);
        } else if (tournament.seedingMethod === 'STANDARD' || tournament.seedingMethod === 'SEQUENTIAL') {
            // Default sorting by seed handled by DB query above.
            // If manual seeding is needed or ELO ignoring requested by other means, can be done here.
        }

        if (entries.length < 2) {
            throw new ApiError('Legalább 2 résztvevő szükséges (a selejtező után)', 400, 'NOT_ENOUGH_PARTICIPANTS');
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
            let participants = [...entries];
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
            const numParticipants = entries.length;
            const numRounds = Math.ceil(Math.log2(numParticipants));
            const bracketSize = Math.pow(2, numRounds);

            const seededEntries: (typeof entries[0] | null)[] = [];
            for (let i = 0; i < bracketSize; i++) {
                seededEntries.push(entries[i] || null);
            }

            // Create upper bracket matches (using standard seeding OR sequential for qualifiers)
            const firstRoundMatches = bracketSize / 2;

            // If qualifier, we assume the list is already sorted by strength (qualifier points)
            // and we want to match 1vs2, 3vs4 etc to minimize byes and strict skill matching?
            // OR maybe user wants 1vs2 to NOT match top players immediately? 
            // User request: "csak egymás ellen kellene rakni őket... ignorálni az elot"
            // -> Sounds like pure sequential pairing 1-2, 3-4 from the available list.

            let seeds: number[] = [];
            if (tournament.seedingMethod === 'SEQUENTIAL' || (tournament.hasQualifier && tournament.seedingMethod !== 'STANDARD')) {
                // Sequential seeding: 1, 2, 3, 4, 5, 6...
                // Default to sequential for qualifiers unless explicitly standard, OR if SEQUENTIAL selected.
                seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);
            } else if (tournament.seedingMethod === 'RANDOM') {
                // Random was handled by shuffling entries, so we can use Sequential seeds [1..N] on the shuffled list
                seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);
            } else {
                // Standard seeding: 1, 8, 4, 5... (1vs8, 2vs7)
                seeds = getStandardSeeding(bracketSize);
            }

            for (let i = 0; i < firstRoundMatches; i++) {
                const seed1 = seeds[i * 2];
                const seed2 = seeds[i * 2 + 1];

                // seed is 1-based index
                const homeEntry = (seed1 <= entries.length) ? entries[seed1 - 1] : null;
                const awayEntry = (seed2 <= entries.length) ? entries[seed2 - 1] : null;

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
            const numParticipants = entries.length;
            const numRounds = Math.ceil(Math.log2(numParticipants));
            const bracketSize = Math.pow(2, numRounds);

            const seededEntries: (typeof entries[0] | null)[] = [];
            for (let i = 0; i < bracketSize; i++) {
                seededEntries.push(entries[i] || null);
            }

            const firstRoundMatches = bracketSize / 2;

            let seeds: number[] = [];
            if (tournament.seedingMethod === 'SEQUENTIAL' || (tournament.hasQualifier && tournament.seedingMethod !== 'STANDARD')) {
                // Sequential seeding
                seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);
            } else if (tournament.seedingMethod === 'RANDOM') {
                seeds = Array.from({ length: bracketSize }, (_, i) => i + 1);
            } else {
                seeds = getStandardSeeding(bracketSize);
            }

            for (let i = 0; i < firstRoundMatches; i++) {
                const seed1 = seeds[i * 2];
                const seed2 = seeds[i * 2 + 1];

                const homeEntry = (seed1 <= entries.length) ? entries[seed1 - 1] : null;
                const awayEntry = (seed2 <= entries.length) ? entries[seed2 - 1] : null;

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

        // Log bracket generation
        await logSystemActivity(
            'TOURNAMENT_GENERATE_BRACKET',
            `Bracket generated for tournament '${tournament.name}' by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    tournamentId: tournament.id,
                    matchCount: finalMatches.length,
                    format: tournament.format
                }
            }
        );

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

// Helper function to generate standard seeding indices (1-based)
function getStandardSeeding(size: number): number[] {
    if (size < 2) return [1];

    let seeds = [1, 2];
    const rounds = Math.ceil(Math.log2(size));

    for (let i = 0; i < rounds - 1; i++) {
        const nextSeeds: number[] = [];
        const currentCount = seeds.length * 2;
        for (const seed of seeds) {
            nextSeeds.push(seed);
            nextSeeds.push(currentCount + 1 - seed);
        }
        seeds = nextSeeds;
    }
    return seeds;
}
