import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

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
            throw new ApiError('Only organizers can create tournaments', 403, 'FORBIDDEN');
        }

        const {
            name,
            description,
            gameId,
            format,
            maxTeams,
            startDate,
            endDate,
            registrationDeadline,
        } = req.body;

        if (!name || !gameId || !maxTeams || !startDate || !registrationDeadline) {
            throw new ApiError('Missing required fields', 400, 'MISSING_FIELDS');
        }

        // Verify game exists
        const game = await prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            throw new ApiError('Game not found', 404, 'GAME_NOT_FOUND');
        }

        const tournament = await prisma.tournament.create({
            data: {
                name,
                description,
                gameId,
                format: format || 'SINGLE_ELIMINATION',
                maxTeams,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                registrationDeadline: new Date(registrationDeadline),
                status: 'DRAFT',
            },
            include: { game: true },
        });

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
                    },
                    orderBy: { seed: 'asc' },
                },
                matches: {
                    include: {
                        homeTeam: { select: { id: true, name: true, logoUrl: true } },
                        awayTeam: { select: { id: true, name: true, logoUrl: true } },
                        winner: { select: { id: true, name: true } },
                    },
                    orderBy: [{ round: 'asc' }, { position: 'asc' }],
                },
            },
        });

        if (!tournament) {
            throw new ApiError('Tournament not found', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: tournament });
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
            throw new ApiError('Only organizers can update tournaments', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
        });

        if (!tournament) {
            throw new ApiError('Tournament not found', 404, 'NOT_FOUND');
        }

        const {
            name,
            description,
            status,
            startDate,
            endDate,
            registrationDeadline,
        } = req.body;

        const updated = await prisma.tournament.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(registrationDeadline && { registrationDeadline: new Date(registrationDeadline) }),
            },
            include: { game: true },
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
            throw new ApiError('Team ID is required', 400, 'MISSING_TEAM_ID');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: { _count: { select: { entries: true } } },
        });

        if (!tournament) {
            throw new ApiError('Tournament not found', 404, 'NOT_FOUND');
        }

        if (tournament.status !== 'REGISTRATION') {
            throw new ApiError('Tournament is not accepting registrations', 400, 'REGISTRATION_CLOSED');
        }

        if (new Date() > tournament.registrationDeadline) {
            throw new ApiError('Registration deadline has passed', 400, 'DEADLINE_PASSED');
        }

        if (tournament._count.entries >= tournament.maxTeams) {
            throw new ApiError('Tournament is full', 400, 'TOURNAMENT_FULL');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Check if user is captain of the team
        const team = await prisma.team.findUnique({
            where: { id: teamId },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'TEAM_NOT_FOUND');
        }

        if (team.ownerId !== user.id) {
            throw new ApiError('Only team captain can register for tournaments', 403, 'NOT_CAPTAIN');
        }

        // Check if already registered
        const existingEntry = await prisma.tournamentEntry.findUnique({
            where: { tournamentId_teamId: { tournamentId: req.params.id, teamId } },
        });

        if (existingEntry) {
            throw new ApiError('Team already registered', 400, 'ALREADY_REGISTERED');
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
            throw new ApiError('Tournament not found', 404, 'NOT_FOUND');
        }

        if (tournament.status !== 'REGISTRATION' && tournament.status !== 'DRAFT') {
            throw new ApiError('Cannot unregister after tournament has started', 400, 'CANNOT_UNREGISTER');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
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
            throw new ApiError('Only organizers can generate brackets', 403, 'FORBIDDEN');
        }

        const tournament = await prisma.tournament.findUnique({
            where: { id: req.params.id },
            include: {
                entries: {
                    include: { team: true },
                    orderBy: { seed: 'desc' }, // Higher ELO = higher seed
                },
            },
        });

        if (!tournament) {
            throw new ApiError('Tournament not found', 404, 'NOT_FOUND');
        }

        if (tournament.entries.length < 2) {
            throw new ApiError('Need at least 2 teams', 400, 'NOT_ENOUGH_TEAMS');
        }

        // Delete existing matches
        await prisma.match.deleteMany({ where: { tournamentId: tournament.id } });

        const teams = tournament.entries.map((e) => e.team);
        const numTeams = teams.length;

        // Calculate number of rounds needed
        const numRounds = Math.ceil(Math.log2(numTeams));
        const bracketSize = Math.pow(2, numRounds);

        // Seed the bracket
        const seededTeams: (typeof teams[0] | null)[] = [];
        for (let i = 0; i < bracketSize; i++) {
            seededTeams.push(teams[i] || null);
        }

        // Create first round matches
        const matches: any[] = [];
        const firstRoundMatches = bracketSize / 2;

        for (let i = 0; i < firstRoundMatches; i++) {
            const homeTeam = seededTeams[i];
            const awayTeam = seededTeams[bracketSize - 1 - i];

            matches.push({
                tournamentId: tournament.id,
                round: 1,
                position: i + 1,
                homeTeamId: homeTeam?.id || null,
                awayTeamId: awayTeam?.id || null,
                status: 'PENDING',
                // If one team is bye, auto-advance
                winnerId: !homeTeam ? awayTeam?.id : !awayTeam ? homeTeam?.id : null,
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
                    homeTeamId: null,
                    awayTeamId: null,
                    status: 'PENDING',
                });
            }
            matchesInRound = matchesInRound / 2;
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
            },
            orderBy: [{ round: 'asc' }, { position: 'asc' }],
        });

        res.json({ success: true, data: createdMatches });
    })
);
