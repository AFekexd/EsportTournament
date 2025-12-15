import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const gamesRouter = Router();

// Get all games
gamesRouter.get(
    '/',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const games = await prisma.game.findMany({
            include: {
                _count: { select: { tournaments: true } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, data: games });
    })
);

// Create game (admin only)
gamesRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Only admins can create games', 403, 'FORBIDDEN');
        }

        const { name, description, imageUrl, rules, teamSize } = req.body;

        if (!name || !teamSize) {
            throw new ApiError('Name and team size are required', 400, 'MISSING_FIELDS');
        }

        if (![1, 2, 3, 5].includes(teamSize)) {
            throw new ApiError('Team size must be 1, 2, 3, or 5', 400, 'INVALID_TEAM_SIZE');
        }

        const game = await prisma.game.create({
            data: {
                name,
                description,
                imageUrl,
                rules,
                teamSize,
            },
        });

        res.status(201).json({ success: true, data: game });
    })
);

// Get game by ID
gamesRouter.get(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const game = await prisma.game.findUnique({
            where: { id: req.params.id },
            include: {
                tournaments: {
                    where: { status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
                    orderBy: { startDate: 'asc' },
                    take: 5,
                },
                _count: { select: { tournaments: true, gameStats: true } },
            },
        });

        if (!game) {
            throw new ApiError('Game not found', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: game });
    })
);

// Update game (admin only)
gamesRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Only admins can update games', 403, 'FORBIDDEN');
        }

        const { name, description, imageUrl, rules, teamSize } = req.body;

        if (teamSize && ![1, 2, 3, 5].includes(teamSize)) {
            throw new ApiError('Team size must be 1, 2, 3, or 5', 400, 'INVALID_TEAM_SIZE');
        }

        const game = await prisma.game.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(imageUrl !== undefined && { imageUrl }),
                ...(rules !== undefined && { rules }),
                ...(teamSize && { teamSize }),
            },
        });

        res.json({ success: true, data: game });
    })
);

// Delete game (admin only)
gamesRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Only admins can delete games', 403, 'FORBIDDEN');
        }

        // Check for existing tournaments
        const tournamentCount = await prisma.tournament.count({
            where: { gameId: req.params.id },
        });

        if (tournamentCount > 0) {
            throw new ApiError('Cannot delete game with existing tournaments', 400, 'HAS_TOURNAMENTS');
        }

        await prisma.game.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Game deleted' });
    })
);
