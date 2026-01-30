import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { UserRole } from '../utils/enums.js';

export const bugReportSettingsRouter: Router = Router();

// Check if user is admin
const requireAdmin = async (req: AuthenticatedRequest) => {
    const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });
    if (!user) throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
    const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);
    if (!isAdmin) throw new ApiError('Nincs jogosultságod', 403, 'FORBIDDEN');
    return user;
};

// Get all notification settings (admins who receive notifications)
bugReportSettingsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await requireAdmin(req);

        const settings = await prisma.bugReportNotificationSetting.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        email: true,
                        discordId: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Also get list of available admins who aren't in the list yet
        const existingUserIds = settings.map(s => s.userId);
        const availableAdmins = await prisma.user.findMany({
            where: {
                role: { in: ['ADMIN', 'ORGANIZER'] },
                id: { notIn: existingUserIds }
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                email: true,
                discordId: true,
                role: true
            }
        });

        res.json({
            success: true,
            data: {
                settings,
                availableAdmins
            }
        });
    })
);

// Add admin to notification list
bugReportSettingsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await requireAdmin(req);

        const { userId, receiveEmail = true, receiveDiscord = true } = req.body;

        if (!userId) {
            throw new ApiError('userId megadása kötelező', 400, 'INVALID_INPUT');
        }

        // Check if user exists and is admin
        const targetUser = await prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isTargetAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(targetUser.role as UserRole);
        if (!isTargetAdmin) {
            throw new ApiError('Csak admin felhasználók adhatók hozzá', 400, 'NOT_ADMIN');
        }

        // Check if already exists
        const existing = await prisma.bugReportNotificationSetting.findUnique({
            where: { userId }
        });
        if (existing) {
            throw new ApiError('Ez a felhasználó már szerepel a listán', 400, 'ALREADY_EXISTS');
        }

        const setting = await prisma.bugReportNotificationSetting.create({
            data: {
                userId,
                receiveEmail,
                receiveDiscord
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        email: true,
                        discordId: true,
                        role: true
                    }
                }
            }
        });

        res.status(201).json({ success: true, data: setting });
    })
);

// Update notification settings for a user
bugReportSettingsRouter.patch(
    '/:userId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await requireAdmin(req);

        const { userId } = req.params;
        const { receiveEmail, receiveDiscord } = req.body;

        const existing = await prisma.bugReportNotificationSetting.findUnique({
            where: { userId }
        });
        if (!existing) {
            throw new ApiError('Beállítás nem található', 404, 'NOT_FOUND');
        }

        const updateData: any = {};
        if (receiveEmail !== undefined) updateData.receiveEmail = receiveEmail;
        if (receiveDiscord !== undefined) updateData.receiveDiscord = receiveDiscord;

        const setting = await prisma.bugReportNotificationSetting.update({
            where: { userId },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        email: true,
                        discordId: true,
                        role: true
                    }
                }
            }
        });

        res.json({ success: true, data: setting });
    })
);

// Remove user from notification list
bugReportSettingsRouter.delete(
    '/:userId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        await requireAdmin(req);

        const { userId } = req.params;

        const existing = await prisma.bugReportNotificationSetting.findUnique({
            where: { userId }
        });
        if (!existing) {
            throw new ApiError('Beállítás nem található', 404, 'NOT_FOUND');
        }

        await prisma.bugReportNotificationSetting.delete({
            where: { userId }
        });

        res.json({ success: true, message: 'Felhasználó eltávolítva az értesítési listáról' });
    })
);
