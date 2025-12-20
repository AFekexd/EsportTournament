import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';
import { syncUserRole } from '../utils/keycloak-admin.js';

export const usersRouter = Router();

// Get all users (admin only)
usersRouter.get(
    '/',
    authenticate,
    requireRole('ADMIN'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: users });
    })
);

// Delete user (admin only)
usersRouter.delete(
    '/:id',
    authenticate,
    requireRole('ADMIN'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        // Prevent deleting self
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        if (user.keycloakId === req.user!.sub) {
            throw new ApiError('Cannot delete yourself', 400, 'BAD_REQUEST');
        }

        await prisma.user.delete({
            where: { id: req.params.id },
        });

        res.json({ success: true, message: 'User deleted successfully' });
    })
);

// Get user by ID
usersRouter.get(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                teamMemberships: {
                    include: { team: true },
                },
                gameStats: {
                    include: { game: true },
                },
            },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: user });
    })
);

// Update user profile
usersRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                teamMemberships: {
                    include: { team: true },
                },
                gameStats: {
                    include: { game: true },
                },
            },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'NOT_FOUND');
        }

        // Check if user is updating their own profile or is admin
        if (user.keycloakId !== req.user!.sub) {
            const currentUser = await prisma.user.findUnique({
                where: { keycloakId: req.user!.sub },
            });
            if (currentUser?.role !== 'ADMIN') {
                throw new ApiError('Cannot update other users', 403, 'FORBIDDEN');
            }
        }

        const { displayName, avatarUrl } = req.body;

        // Process avatar image if base64
        let processedAvatarUrl = avatarUrl;
        if (avatarUrl && isBase64DataUrl(avatarUrl)) {
            if (!validateImageSize(avatarUrl, 150)) {
                throw new ApiError('Avatar too large (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedAvatarUrl = await processImage(avatarUrl);
        }

        const updatedUser = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                ...(displayName && { displayName }),
                ...(processedAvatarUrl !== undefined && { avatarUrl: processedAvatarUrl }),
            },
        });

        res.json({ success: true, data: updatedUser });
    })
);

// Update user role (admin only)
usersRouter.patch(
    '/:id/role',
    authenticate,
    requireRole('ADMIN'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { role } = req.body;

        if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'TEACHER', 'STUDENT'].includes(role)) {
            throw new ApiError('Invalid role', 400, 'INVALID_ROLE');
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
        });

        // Sync role change to Keycloak
        if (user.keycloakId) {
            // Run in background or await? Await to ensure it works before response?
            // Since we catch errors inside syncUserRole, awaiting is fine and safer.
            await syncUserRole(user.keycloakId, role);
        }

        res.json({ success: true, data: user });
    })
);

// Get user's game stats
usersRouter.get(
    '/:id/stats',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const stats = await prisma.gameStats.findMany({
            where: { userId: req.params.id },
            include: { game: true },
        });

        res.json({ success: true, data: stats });
    })
);

// Upsert game stats for user
usersRouter.put(
    '/:id/stats/:gameId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id: userId, gameId } = req.params;
        const { inGameId, stats } = req.body;

        // Only user can update their own stats
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.keycloakId !== req.user!.sub) {
            throw new ApiError('Cannot update other user stats', 403, 'FORBIDDEN');
        }

        const gameStats = await prisma.gameStats.upsert({
            where: {
                userId_gameId: { userId, gameId },
            },
            update: { inGameId, stats },
            create: { userId, gameId, inGameId, stats },
        });

        res.json({ success: true, data: gameStats });
    })
);

// Set user game rank
usersRouter.post(
    '/me/ranks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { gameId, rankId } = req.body;
        const dbUser = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub }, select: { id: true } });
        const userId = dbUser?.id;

        if (!userId) throw new ApiError('User not found', 404, 'NOT_FOUND');
        if (!gameId || !rankId) throw new ApiError('Missing fields', 400, 'BAD_REQUEST');

        // Check if rank belongs to game
        const rank = await prisma.rank.findFirst({
            where: { id: rankId, gameId }
        });
        if (!rank) throw new ApiError('Invalid rank for this game', 400, 'INVALID_RANK');

        const userRank = await prisma.userRank.upsert({
            where: {
                userId_gameId: { userId, gameId }
            },
            update: {
                rankId
            },
            create: {
                userId,
                gameId,
                rankId
            }
        });

        res.json({ success: true, data: userRank });
    })
);

// Get my ranks
usersRouter.get(
    '/me/ranks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const dbUser = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub }, select: { id: true } });
        const userId = dbUser?.id;
        if (!userId) throw new ApiError('User not found', 404, 'NOT_FOUND');

        const userRanks = await prisma.userRank.findMany({
            where: { userId },
            include: { rank: true, game: true }
        });

        res.json({ success: true, data: userRanks });
    })
);
