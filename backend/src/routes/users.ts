import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { UserRole } from '../utils/enums.js';

export const usersRouter: Router = Router();

// Get all users (Admin/Organizer only) or Search users
usersRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(currentUser.role as UserRole)) {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { search, page = '1', limit = '20', role } = req.query;
        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(Math.max(1, parseInt(limit as string)), 100);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {};

        if (role && role !== 'ALL') {
            where.role = role;
        }

        if (search) {
            where.OR = [
                { username: { contains: String(search), mode: 'insensitive' } },
                { displayName: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        const [users, total] = await prisma.$transaction([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limitNum,
                skip,
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    role: true,
                    elo: true,
                    email: true,
                    omId: true,
                    createdAt: true,
                    timeBalanceSeconds: true
                }
            }),
            prisma.user.count({ where })
        ]);

        res.json({
            success: true,
            data: users,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
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

        await logSystemActivity('USER_DELETE', `User ID ${userId} deleted by ${currentUser.username}`, { adminId: currentUser.id });

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

        if (!currentUser || currentUser.role !== UserRole.ADMIN) {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { role } = req.body;
        if (!Object.values(UserRole).includes(role)) {
            throw new ApiError('Érvénytelen szerepkör', 400, 'INVALID_ROLE');
        }

        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { role },
        });

        await logSystemActivity('USER_ROLE_UPDATE', `User ${user.username} role changed to ${role} by ${currentUser.username}`, { adminId: currentUser.id, userId: user.id });

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
        if (currentUser.role !== UserRole.ADMIN && currentUser.id !== targetUserId) {
            throw new ApiError('Nincs jogosultságod a profil szerkesztéséhez', 403, 'FORBIDDEN');
        }

        const { displayName, avatarUrl, emailNotifications, steamId } = req.body as {
            displayName?: string;
            avatarUrl?: string;
            emailNotifications?: boolean;
            steamId?: string;
        };

        if (displayName && displayName !== currentUser.displayName && currentUser.role !== UserRole.ADMIN) {
            throw new ApiError('A megjelenítendő nevet csak adminisztrátor módosíthatja', 403, 'FORBIDDEN');
        }

        // If not Admin/Organizer, create Change Request instead of immediate update
        // We only require approval for profile data (name, avatar, steam), not settings like notifications
        if (![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(currentUser.role as UserRole)) {
            // Check if any restricted fields are ACTUALLY changing
            const isNameChanged = displayName !== undefined && displayName !== currentUser.displayName;
            const isAvatarChanged = avatarUrl !== undefined && avatarUrl !== currentUser.avatarUrl;
            const isSteamChanged = steamId !== undefined && steamId !== currentUser.steamId;

            const isRestrictedChange = isNameChanged || isAvatarChanged || isSteamChanged;

            if (isRestrictedChange) {
                // Check for existing pending request
                const existingRequest = await prisma.changeRequest.findFirst({
                    where: {
                        entityId: targetUserId,
                        type: 'USER_PROFILE',
                        status: 'PENDING'
                    }
                });

                if (existingRequest) {
                    throw new ApiError('Már van függőben lévő kérelmed.', 400, 'DUPLICATE_REQUEST');
                }

                await prisma.changeRequest.create({
                    data: {
                        type: 'USER_PROFILE',
                        entityId: targetUserId,
                        requesterId: currentUser.id,
                        data: {
                            ...(displayName !== undefined && { displayName }),
                            ...(avatarUrl !== undefined && { avatarUrl }),
                            ...(steamId !== undefined && { steamId }),
                            // We might want to include notifications too if they are part of the payload, but usually they are separate.
                            // For simplicity storing everything from payload.
                            ...(emailNotifications !== undefined && { emailNotifications })
                        }
                    }
                });

                res.status(202).json({
                    success: true,
                    message: 'A változtatások jóváhagyásra várnak.',
                    data: currentUser // Return current data, client should handle the "pending" state UI
                });
                return;
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                displayName,
                avatarUrl,
                emailNotifications,
                steamId,
            },
        });

        // Determine who did it for the log
        const isSelf = currentUser.id === targetUserId;
        const changes: string[] = [];
        if (displayName !== undefined) changes.push(`Display Name ('${displayName}')`);
        if (avatarUrl !== undefined) changes.push('Avatar');
        if (emailNotifications !== undefined) changes.push(`Notifications (${emailNotifications})`);
        if (steamId !== undefined) changes.push(`Steam ID ('${steamId}')`);

        await logSystemActivity(
            'USER_PROFILE_UPDATE',
            `User ${updatedUser.username} profile updated by ${isSelf ? 'themselves' : currentUser.username}. Changes: ${changes.join(', ')}`,
            {
                userId: updatedUser.id,
                adminId: isSelf ? undefined : currentUser.id,
                metadata: {
                    changes,
                    updatedFields: {
                        ...(displayName !== undefined && { displayName }),
                        ...(avatarUrl !== undefined && { avatarUrl }),
                        ...(emailNotifications !== undefined && { emailNotifications }),
                        ...(steamId !== undefined && { steamId })
                    }
                }
            }
        );

        res.json({ success: true, data: updatedUser });
    })
);
// Get public user profile
usersRouter.get(
    '/:id/public',
    optionalAuth,
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
                steamId: true,
                steamAvatar: true,
                steamUrl: true,
                steamLevel: true,
                steamPersonaname: true,
                steamCreatedAt: true,
                perfectGamesCount: true,
                createdAt: true,
                teamMemberships: {
                    select: {
                        team: {
                            include: {
                                members: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    }
                },
                ranks: {
                    select: {
                        id: true,
                        gameId: true,
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
            steamId: user.steamId,
            steamAvatar: user.steamAvatar,
            steamUrl: user.steamUrl,
            steamLevel: user.steamLevel,
            steamPersonaname: user.steamPersonaname,
            steamCreatedAt: user.steamCreatedAt,
            perfectGamesCount: user.perfectGamesCount,
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
