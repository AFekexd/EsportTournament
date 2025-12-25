import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';
import { notificationService } from '../services/notificationService.js';

export const gamesRouter = Router();

// Get all games
gamesRouter.get(
    '/',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const games = await prisma.game.findMany({
            include: {
                _count: { select: { tournaments: true, userRanks: true } },
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

        if (!user || user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
            throw new ApiError('Csak adminisztrátorok és organizátorok hozhatnak létre játékokat', 403, 'FORBIDDEN');
        }

        const { name, description, imageUrl, rules, teamSize } = req.body;

        if (!name) {
            throw new ApiError('A név kötelező', 400, 'MISSING_FIELDS');
        }

        if (teamSize && ![1, 2, 3, 5].includes(teamSize)) {
            throw new ApiError('A csapatméretnek 1, 2, 3 vagy 5-nek kell lennie', 400, 'INVALID_TEAM_SIZE');
        }

        // Process image if base64
        let processedImageUrl = imageUrl;
        if (imageUrl && isBase64DataUrl(imageUrl)) {
            if (!validateImageSize(imageUrl, 10)) {
                throw new ApiError('A kép túl nagy (max 10MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedImageUrl = await processImage(imageUrl);
        }

        const game = await prisma.game.create({
            data: {
                name,
                description,
                imageUrl: processedImageUrl,
                rules,
                teamSize: teamSize || 1, // Default to 1v1
            },
        });

        // Notify all users about the new game
        notificationService.notifyAllUsersNewGame(game)
            .catch(err => console.error('Failed to notify users about new game:', err));

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
                _count: { select: { tournaments: true, userRanks: true } },
            },
        });

        if (!game) {
            throw new ApiError('A játék nem található', 404, 'NOT_FOUND');
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
 
        if (!user || user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
            throw new ApiError('Csak adminisztrátorok és organizátorok módosíthatnak játékokat', 403, 'FORBIDDEN');
        }

        const { name, description, imageUrl, rules, teamSize } = req.body;

        if (teamSize && ![1, 2, 3, 5].includes(teamSize)) {
            throw new ApiError('A csapatméretnek 1, 2, 3 vagy 5-nek kell lennie', 400, 'INVALID_TEAM_SIZE');
        }

        // Process image if base64
        let processedImageUrl = imageUrl;
        if (imageUrl && isBase64DataUrl(imageUrl)) {
            if (!validateImageSize(imageUrl, 10)) {
                throw new ApiError('A kép túl nagy (max 10MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedImageUrl = await processImage(imageUrl);
        }

        const game = await prisma.game.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(processedImageUrl !== undefined && { imageUrl: processedImageUrl }),
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

        if (!user || user.role !== 'ADMIN' && user.role !== 'ORGANIZER') {
            throw new ApiError('Csak adminisztrátorok és organizátorok törölhetnek játékokat', 403, 'FORBIDDEN');
        }

        // Check for existing tournaments
        const tournamentCount = await prisma.tournament.count({
            where: { gameId: req.params.id },
        });

        if (tournamentCount > 0) {
            throw new ApiError('Nem lehet törölni olyan játékot, amelyhez versenyek tartoznak', 400, 'HAS_TOURNAMENTS');
        }

        await prisma.game.delete({ where: { id: req.params.id } });

        res.json({ success: true, message: 'Game deleted' });
    })
);

// Get ranks for a game
gamesRouter.get(
    '/:id/ranks',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const ranks = await prisma.rank.findMany({
            where: { gameId: req.params.id },
            orderBy: { order: 'asc' },
        });

        res.json({ success: true, data: ranks });
    })
);

// Add rank to game (admin only)
gamesRouter.post(
    '/:id/ranks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { name, value, image, order } = req.body;

        if (!name || value === undefined) {
            throw new ApiError('A név és érték kötelező', 400, 'MISSING_FIELDS');
        }

        const rank = await prisma.rank.create({
            data: {
                gameId: req.params.id,
                name,
                value: Number(value),
                image,
                order: order ? Number(order) : 0,
            },
        });

        res.status(201).json({ success: true, data: rank });
    })
);

// Delete rank (admin only)
gamesRouter.delete(
    '/ranks/:rankId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        await prisma.rank.delete({
            where: { id: req.params.rankId },
        });

        res.json({ success: true, message: 'Rank deleted' });
    })
);
