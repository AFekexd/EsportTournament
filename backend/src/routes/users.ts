import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const usersRouter = Router();

// Get all users (Admin/Organizer only)
usersRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || !['ADMIN', 'ORGANIZER'].includes(currentUser.role)) {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: users });
    })
);

// Delete user (Admin only)
usersRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || currentUser.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const userId = req.params.id;

        // Prevent deleting self
        if (userId === currentUser.id) {
            throw new ApiError('Nem törölheted saját magad', 400, 'CANNOT_DELETE_SELF');
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        res.json({ success: true, message: 'Felhasználó törölve' });
    })
);

// Update user role (Admin only)
usersRouter.patch(
    '/:id/role',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || currentUser.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { role } = req.body;
        if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'TEACHER', 'STUDENT'].includes(role)) {
            throw new ApiError('Érvénytelen szerepkör', 400, 'INVALID_ROLE');
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
        });

        res.json({ success: true, data: user });
    })
);

// Update user profile (User/Admin)
usersRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const targetUserId = req.params.id;

        // Allow if admin OR if updating self
        if (currentUser.role !== 'ADMIN' && currentUser.id !== targetUserId) {
            throw new ApiError('Nincs jogosultságod a profil szerkesztéséhez', 403, 'FORBIDDEN');
        }

        const { displayName, avatarUrl, emailNotifications } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                displayName,
                avatarUrl,
                emailNotifications,
            },
        });

        res.json({ success: true, data: updatedUser });
    })
);
// Get public user profile
usersRouter.get(
    '/:id/public',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.params.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
                teamMemberships: {
                    include: {
                        team: true
                    }
                },
                ranks: {
                    include: {
                        rank: true,
                        game: true
                    }
                }
            }
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Formatting response to be cleaner
        const publicProfile = {
            id: user.id,
            username: user.username,
            displayName: user?.displayName,
            avatarUrl: user?.avatarUrl,
            role: user.role,
            createdAt: user.createdAt,
            teams: user.teamMemberships.map(tm => tm.team),
            ranks: user.ranks.map(ur => ({
                id: ur.id,
                gameId: ur.gameId,
                gameName: ur.game.name,
                gameImage: ur.game.imageUrl,
                rankName: ur.rank.name,
                rankValue: ur.rank.value,
                rankImage: ur.rank.image
            }))
        };

        res.json({ success: true, data: publicProfile });
    })
);
