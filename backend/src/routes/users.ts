import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { UserRole } from '../utils/enums.js';
import { notificationService } from '../services/notificationService.js';

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


// Get own ranks
usersRouter.get(
    '/me/ranks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const userRanks = await prisma.userRank.findMany({
            where: { userId: currentUser.id },
            include: {
                rank: true,
                game: true
            }
        });

        res.json({
            success: true,
            data: userRanks
        });
    })
);

// Set own rank
usersRouter.post(
    '/me/ranks',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { gameId, rankId } = req.body;

        if (!gameId || !rankId) {
            throw new ApiError('GameId és RankId kötelező', 400, 'MISSING_FIELDS');
        }

        const userRank = await prisma.userRank.upsert({
            where: {
                userId_gameId: {
                    userId: currentUser.id,
                    gameId
                }
            },
            update: {
                rankId
            },
            create: {
                userId: currentUser.id,
                gameId,
                rankId
            },
            include: {
                rank: true,
                game: true
            }
        });

        // Log the change
        await logSystemActivity(
            'USER_RANK_UPDATE',
            `User ${currentUser.username} updated rank for game ${userRank.game.name} to ${userRank.rank.name}`,
            { userId: currentUser.id, metadata: { gameId, rankId } }
        );

        res.json({
            success: true,
            data: userRank
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


        // Delete related ChangeRequests first to avoid Foreign Key constraint errors
        await prisma.changeRequest.deleteMany({
            where: {
                OR: [
                    { requesterId: userId },
                    { entityId: userId }
                ]
            }
        });

        await prisma.user.delete({
            where: { id: userId },
        });

        await logSystemActivity('USER_DELETE', `User ID ${userId} deleted by ${currentUser.username}`, { adminId: currentUser.id });

        res.json({ success: true, message: 'Felhasználó törölve' });
    })
);

// Logout user (Admin only)
usersRouter.post(
    '/:id/logout',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || currentUser.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const userId = req.params.id;

        // Prevent logging out self (optional, but good practice to avoid accidental lockout)
        if (userId === currentUser.id) {
            throw new ApiError('Saját magadat nem jelentkeztetheted ki', 400, 'CANNOT_LOGOUT_SELF');
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { lastLogoutAt: new Date() },
        });

        await logSystemActivity(
            'USER_LOGOUT',
            `User ${user.username} logged out by admin ${currentUser.username}`,
            { adminId: currentUser.id, userId: user.id }
        );

        res.json({ success: true, message: 'Felhasználó kijelentkeztetve' });
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

        // --- SPLIT UPDATE LOGIC ---

        // 1. Identify Restricted vs Immediate fields
        const isNameChanged = displayName !== undefined && displayName !== currentUser.displayName;
        const isAvatarChanged = avatarUrl !== undefined && avatarUrl !== currentUser.avatarUrl;

        // These are restricted and require approval if not Admin/Organizer
        const restrictedChangesProvided = isNameChanged || isAvatarChanged;
        const isRestrictedContext = ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(currentUser.role as UserRole);

        let immediateData: any = {};
        let pendingData: any = {};

        if (isRestrictedContext && restrictedChangesProvided) {
            // Split the data
            if (isNameChanged) pendingData.displayName = displayName;
            if (isAvatarChanged) pendingData.avatarUrl = avatarUrl;

            // Immediate fields
            if (emailNotifications !== undefined) immediateData.emailNotifications = emailNotifications;
            if (steamId !== undefined) immediateData.steamId = steamId;
        } else {
            // If Admin or no restricted changes, everything is immediate
            if (displayName !== undefined) immediateData.displayName = displayName;
            if (avatarUrl !== undefined) immediateData.avatarUrl = avatarUrl;
            if (emailNotifications !== undefined) immediateData.emailNotifications = emailNotifications;
            if (steamId !== undefined) immediateData.steamId = steamId;
        }

        // 2. Handle Pending Request (Atomic creation)
        if (Object.keys(pendingData).length > 0) {
            // Check for existing pending request
            const existingRequest = await prisma.changeRequest.findFirst({
                where: {
                    entityId: targetUserId,
                    type: 'USER_PROFILE',
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                // If a request exists, we might want to UPDATE it or error.
                // For simplicity, erroring to avoid complex merging logic.
                // Or we can just let them know one is already pending.
                throw new ApiError('Már van függőben lévő kérelmed (Név/Avatár). Várd meg az elbírálást!', 400, 'DUPLICATE_REQUEST');
            }

            await prisma.changeRequest.create({
                data: {
                    type: 'USER_PROFILE',
                    entityId: targetUserId,
                    requesterId: currentUser.id,
                    data: pendingData
                }
            });

            // Notify User
            await notificationService.createNotification({
                userId: currentUser.id,
                type: 'SYSTEM',
                title: 'Módosítási kérelem elküldve',
                message: 'A neved/avatárod módosítása adminisztrátori jóváhagyásra vár.',
                link: '/settings'
            });
        }

        // 3. Handle Immediate Update
        let updatedUser = currentUser;

        if (Object.keys(immediateData).length > 0) {
            updatedUser = await prisma.user.update({
                where: { id: targetUserId },
                data: immediateData,
            });

            // Log immediate changes
            const changes: string[] = [];
            if (immediateData.displayName !== undefined) changes.push(`Display Name ('${immediateData.displayName}')`);
            if (immediateData.avatarUrl !== undefined) changes.push('Avatar');
            if (immediateData.emailNotifications !== undefined) changes.push(`Notifications (${immediateData.emailNotifications})`);
            if (immediateData.steamId !== undefined) changes.push(`Steam ID ('${immediateData.steamId}')`);

            const isSelf = currentUser.id === targetUserId;
            await logSystemActivity(
                'USER_PROFILE_UPDATE',
                `User ${updatedUser.username} profile updated by ${isSelf ? 'themselves' : currentUser.username}. Changes: ${changes.join(', ')}`,
                {
                    userId: updatedUser.id,
                    adminId: isSelf ? undefined : currentUser.id,
                    metadata: { changes, updatedFields: immediateData }
                }
            );
        }

        // 4. Response
        // If we created a pending request BUT also updated some fields, we should return 200 with the updated user,
        // but maybe include a message or flag. 
        // If ONLY pending request was created, 202 is appropriate.

        if (Object.keys(pendingData).length > 0 && Object.keys(immediateData).length === 0) {
            res.status(202).json({
                success: true,
                message: 'A változtatások jóváhagyásra várnak.',
                data: currentUser
            });
        } else if (Object.keys(pendingData).length > 0) {
            // Mixed status: Some updated, some pending.
            res.json({
                success: true,
                data: updatedUser,
                message: 'A beállítások mentve. A név/avatár módosítás jóváhagyásra vár.'
            });
        } else {
            // Normal update
            res.json({ success: true, data: updatedUser });
        }
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
