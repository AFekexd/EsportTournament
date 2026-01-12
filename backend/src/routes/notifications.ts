import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { notificationService } from '../services/notificationService.js';
import prisma from '../lib/prisma.js';

export const notificationsRouter: Router = Router();

// Get user notifications
notificationsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { page = '1', limit = '20' } = req.query;

        const result = await notificationService.getUserNotifications(
            user.id,
            parseInt(page as string),
            parseInt(limit as string)
        );

        res.json({ success: true, data: result.notifications, pagination: result.pagination });
    })
);

// Get unread count
notificationsRouter.get(
    '/unread-count',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const count = await notificationService.getUnreadCount(user.id);

        res.json({ success: true, data: { count } });
    })
);

// Mark notification as read
notificationsRouter.patch(
    '/:id/read',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        await notificationService.markAsRead(req.params.id, user.id);

        res.json({ success: true, message: 'Notification marked as read' });
    })
);

// Mark all notifications as read
notificationsRouter.patch(
    '/read-all',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        await notificationService.markAllAsRead(user.id);

        res.json({ success: true, message: 'All notifications marked as read' });
    })
);

// Delete notification
notificationsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        await notificationService.deleteNotification(req.params.id, user.id);

        res.json({ success: true, message: 'Notification deleted' });
    })
);

// Delete all notifications
notificationsRouter.delete(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        await notificationService.deleteAllNotifications(user.id);

        res.json({ success: true, message: 'All notifications deleted' });
    })
);
