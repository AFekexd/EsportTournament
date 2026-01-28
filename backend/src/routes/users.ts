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
                    timeBalanceSeconds: true,
                    tosAcceptedAt: true
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

// Delete own rank
usersRouter.delete(
    '/me/ranks/:gameId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { gameId } = req.params;

        // Check if exists
        const existing = await prisma.userRank.findUnique({
            where: {
                userId_gameId: {
                    userId: currentUser.id,
                    gameId
                }
            }
        });

        if (!existing) {
            throw new ApiError('Nem található rang ehhez a játékhoz', 404, 'RANK_NOT_FOUND');
        }

        await prisma.userRank.delete({
            where: {
                userId_gameId: {
                    userId: currentUser.id,
                    gameId
                }
            }
        });

        // Log the change
        await logSystemActivity(
            'USER_RANK_DELETE',
            `User ${currentUser.username} removed rank for game ${gameId}`,
            { userId: currentUser.id, metadata: { gameId } }
        );

        res.json({
            success: true,
            data: { gameId }
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

        const {
            displayName,
            avatarUrl,
            emailNotifications,
            emailPrefTournaments,
            emailPrefMatches,
            emailPrefBookings,
            emailPrefSystem,
            emailPrefWeeklyDigest,
            steamId,
            favoriteGameId,
            elo
        } = req.body as {
            displayName?: string;
            avatarUrl?: string;
            emailNotifications?: boolean;
            emailPrefTournaments?: boolean;
            emailPrefMatches?: boolean;
            emailPrefBookings?: boolean;
            emailPrefSystem?: boolean;
            emailPrefWeeklyDigest?: boolean;
            steamId?: string;
            favoriteGameId?: string | null;
            elo?: number;
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

            // Immediate fields (email preferences are always immediate)
            if (emailNotifications !== undefined) immediateData.emailNotifications = emailNotifications;
            if (emailPrefTournaments !== undefined) immediateData.emailPrefTournaments = emailPrefTournaments;
            if (emailPrefMatches !== undefined) immediateData.emailPrefMatches = emailPrefMatches;
            if (emailPrefBookings !== undefined) immediateData.emailPrefBookings = emailPrefBookings;
            if (emailPrefSystem !== undefined) immediateData.emailPrefSystem = emailPrefSystem;
            if (emailPrefWeeklyDigest !== undefined) immediateData.emailPrefWeeklyDigest = emailPrefWeeklyDigest;
            if (steamId !== undefined) immediateData.steamId = steamId;
            if (favoriteGameId !== undefined) immediateData.favoriteGameId = favoriteGameId;
        } else {
            // If Admin or no restricted changes, everything is immediate
            if (displayName !== undefined) immediateData.displayName = displayName;
            if (avatarUrl !== undefined) immediateData.avatarUrl = avatarUrl;
            if (emailNotifications !== undefined) immediateData.emailNotifications = emailNotifications;
            if (emailPrefTournaments !== undefined) immediateData.emailPrefTournaments = emailPrefTournaments;
            if (emailPrefMatches !== undefined) immediateData.emailPrefMatches = emailPrefMatches;
            if (emailPrefBookings !== undefined) immediateData.emailPrefBookings = emailPrefBookings;
            if (emailPrefSystem !== undefined) immediateData.emailPrefSystem = emailPrefSystem;
            if (emailPrefWeeklyDigest !== undefined) immediateData.emailPrefWeeklyDigest = emailPrefWeeklyDigest;
            if (steamId !== undefined) immediateData.steamId = steamId;
            if (favoriteGameId !== undefined) immediateData.favoriteGameId = favoriteGameId;

            // ELO Update (Admin only)
            if (elo !== undefined) {
                if (currentUser.role !== UserRole.ADMIN) {
                    throw new ApiError('Csak adminisztrátor módosíthatja az ELO pontszámot', 403, 'FORBIDDEN');
                }
                immediateData.elo = elo;
            }
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
            const { calculateDiff } = await import('../utils/diffUtils.js');
            const detailedChanges = calculateDiff(currentUser, immediateData);

            updatedUser = await prisma.user.update({
                where: { id: targetUserId },
                data: immediateData,
            });

            const isSelf = currentUser.id === targetUserId;
            await logSystemActivity(
                'USER_PROFILE_UPDATE',
                `User ${updatedUser.username} profile updated by ${isSelf ? 'themselves' : currentUser.username}`,
                {
                    userId: updatedUser.id,
                    adminId: isSelf ? undefined : currentUser.id,
                    metadata: { changes: detailedChanges }
                }
            );

            // Web-Discord Sync
            const { webSyncService } = await import('../services/webSyncService.js');
            await webSyncService.onUserUpdate(updatedUser.id);
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

// Accept Terms of Service
usersRouter.post(
    '/me/accept-tos',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const data = await prisma.user.update({
            where: { id: currentUser.id },
            data: { tosAcceptedAt: new Date() }
        });

        await logSystemActivity(
            'USER_TOS_ACCEPT',
            `User ${currentUser.username} accepted Terms of Service`,
            { userId: currentUser.id }
        );

        res.json({ success: true, data });
    })
);

// Reset all users ToS (Admin only)
usersRouter.post(
    '/reset-tos',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || currentUser.role !== UserRole.ADMIN) {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const result = await prisma.user.updateMany({
            data: { tosAcceptedAt: null }
        });

        await logSystemActivity(
            'SYSTEM_TOS_RESET',
            `Admin ${currentUser.username} reset ToS acceptance for all users`,
            { adminId: currentUser.id, metadata: { count: result.count } }
        );

        res.json({ success: true, message: `Sikeresen alaphelyzetbe állítva ${result.count} felhasználónál.` });
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
            include: {
                teamMemberships: {
                    include: {
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
                favoriteGame: {
                    select: {
                        id: true,
                        imageUrl: true
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
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            role: user.role,
            elo: user.elo,
            steamId: user.steamId,
            steamAvatar: user.steamAvatar,
            steamUrl: user.steamUrl,
            steamLevel: user.steamLevel,
            steamPersonaname: user.steamPersonaname,
            steamCreatedAt: user.steamCreatedAt,
            perfectGamesCount: user.perfectGamesCount,
            createdAt: user.createdAt,
            teams: user.teamMemberships.map(tm => ({
                ...tm.team,
                currentUserRole: tm.role
            })),
            ranks: user.ranks.map(ur => ({
                id: ur.id,
                gameId: ur.gameId,
                gameName: ur.game.name,
                gameImage: ur.game.imageUrl,
                rankName: ur.rank.name,
                rankValue: ur.rank.value,
                rankImage: ur.rank.image
            })),
            favoriteGame: user.favoriteGame || undefined,
            discordId: user.discordId
        };

        res.json({ success: true, data: publicProfile });
    })
);
