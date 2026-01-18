/**
 * Admin Email Routes
 * Handles bulk email sending and email log management
 */

import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { emailService } from '../services/emailService.js';
import { digestService } from '../services/digestService.js';
import { logSystemActivity } from '../services/logService.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { EmailType, EmailStatus } from '../generated/prisma/client.js';

export const adminEmailRouter: Router = Router();

// Middleware to check admin role
const requireAdmin = asyncHandler(async (req: AuthenticatedRequest, _res: Response, next: Function) => {
    const user = await prisma.user.findUnique({
        where: { keycloakId: req.user!.sub }
    });

    if (!user || !['ADMIN', 'ORGANIZER'].includes(user.role)) {
        throw new ApiError('Admin jogosultság szükséges', 403, 'FORBIDDEN');
    }

    (req as any).adminUser = user;
    next();
});

/**
 * GET /api/admin/email/logs
 * Get email logs with pagination and filtering
 */
adminEmailRouter.get(
    '/logs',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { page, limit, type, status, to } = req.query;

        const result = await emailService.getEmailLogs({
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 50,
            type: type as EmailType | undefined,
            status: status as EmailStatus | undefined,
            to: to as string | undefined
        });

        res.json({ success: true, ...result });
    })
);

/**
 * GET /api/admin/email/stats
 * Get email sending statistics
 */
adminEmailRouter.get(
    '/stats',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const stats = await emailService.getEmailStats();
        res.json({ success: true, data: stats });
    })
);

/**
 * POST /api/admin/email/broadcast
 * Send broadcast email to all users or filtered group
 */
adminEmailRouter.post(
    '/broadcast',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { title, message, targetRole, targetGame } = req.body;
        const adminUser = (req as any).adminUser;

        if (!title || !message) {
            throw new ApiError('Cím és üzenet kötelező', 400, 'MISSING_FIELDS');
        }

        // Build user query based on filters
        const where: any = {
            emailNotifications: true // Only users who want emails
        };

        if (targetRole) {
            where.role = targetRole;
        }

        // If targeting users interested in a specific game
        if (targetGame) {
            where.gameStats = {
                some: { gameId: targetGame }
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: { id: true, email: true }
        });

        if (users.length === 0) {
            throw new ApiError('Nem található célzott felhasználó', 400, 'NO_RECIPIENTS');
        }

        // Log the broadcast action
        await logSystemActivity(
            'ADMIN_EMAIL_BROADCAST',
            `Admin ${adminUser.username} sent broadcast email: "${title}" to ${users.length} users`,
            { adminId: adminUser.id, metadata: { title, recipientCount: users.length } }
        );

        // Send emails asynchronously
        res.json({
            success: true,
            message: `Email küldés elindítva ${users.length} felhasználónak`,
            recipientCount: users.length
        });

        // Run in background
        (async () => {
            let sent = 0;
            let failed = 0;

            for (const user of users) {
                try {
                    const success = await emailService.sendAdminBroadcast(
                        user.email,
                        title,
                        message,
                        adminUser.displayName || adminUser.username
                    );
                    if (success) sent++;
                    else failed++;
                } catch (e) {
                    failed++;
                }
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`📧 Broadcast complete: ${sent} sent, ${failed} failed`);
        })();
    })
);

/**
 * POST /api/admin/email/send
 * Send email to specific user(s)
 */
adminEmailRouter.post(
    '/send',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { userIds, emails, title, message } = req.body;
        const adminUser = (req as any).adminUser;

        if (!title || !message) {
            throw new ApiError('Cím és üzenet kötelező', 400, 'MISSING_FIELDS');
        }

        let recipients: string[] = [];

        // Get emails from user IDs
        if (userIds && userIds.length > 0) {
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { email: true }
            });
            recipients = users.map(u => u.email);
        }

        // Add direct email addresses
        if (emails && emails.length > 0) {
            recipients = [...recipients, ...emails];
        }

        // Remove duplicates
        recipients = [...new Set(recipients)];

        if (recipients.length === 0) {
            throw new ApiError('Nincs címzett megadva', 400, 'NO_RECIPIENTS');
        }

        await logSystemActivity(
            'ADMIN_EMAIL_SEND',
            `Admin ${adminUser.username} sent email: "${title}" to ${recipients.length} recipients`,
            { adminId: adminUser.id, metadata: { title, recipients } }
        );

        let sent = 0;
        let failed = 0;

        for (const email of recipients) {
            const success = await emailService.sendAdminBroadcast(
                email,
                title,
                message,
                adminUser.displayName || adminUser.username
            );
            if (success) sent++;
            else failed++;
        }

        res.json({
            success: true,
            message: `Email küldés kész: ${sent} sikeres, ${failed} sikertelen`,
            sent,
            failed
        });
    })
);

/**
 * POST /api/admin/email/test
 * Send test email to the admin
 */
adminEmailRouter.post(
    '/test',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const adminUser = (req as any).adminUser;

        const success = await emailService.sendAdminBroadcast(
            adminUser.email,
            'Teszt Email',
            'Ez egy teszt email az Esport Tournament rendszerből. Ha megkaptad, az email küldés megfelelően működik!',
            adminUser.displayName || adminUser.username
        );

        if (success) {
            res.json({ success: true, message: 'Teszt email elküldve!' });
        } else {
            throw new ApiError('Email küldés sikertelen', 500, 'EMAIL_FAILED');
        }
    })
);

/**
 * POST /api/admin/email/digest/trigger
 * Manually trigger weekly digest (for testing)
 */
adminEmailRouter.post(
    '/digest/trigger',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { userId } = req.body;
        const adminUser = (req as any).adminUser;

        await logSystemActivity(
            'ADMIN_DIGEST_TRIGGER',
            `Admin ${adminUser.username} triggered digest email${userId ? ` for user ${userId}` : ' for all users'}`,
            { adminId: adminUser.id, metadata: { userId } }
        );

        if (userId) {
            // Send to specific user
            const success = await digestService.sendDigestToUser(userId);
            res.json({
                success,
                message: success ? 'Digest email elküldve!' : 'Felhasználó nem található vagy email küldés sikertelen'
            });
        } else {
            // Trigger for all subscribed users (async)
            res.json({
                success: true,
                message: 'Digest email küldés elindítva az összes feliratkozott felhasználónak'
            });

            // Run in background
            digestService.sendWeeklyDigestToAll();
        }
    })
);

/**
 * GET /api/admin/email/types
 * Get available email types for filtering
 */
adminEmailRouter.get(
    '/types',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const types = [
            { value: 'TOURNAMENT_INVITE', label: 'Verseny meghívó' },
            { value: 'TOURNAMENT_ANNOUNCEMENT', label: 'Verseny bejelentés' },
            { value: 'MATCH_REMINDER', label: 'Meccs emlékeztető' },
            { value: 'MATCH_RESULT', label: 'Meccs eredmény' },
            { value: 'BOOKING_CONFIRMATION', label: 'Foglalás megerősítés' },
            { value: 'BOOKING_REMINDER', label: 'Foglalás emlékeztető' },
            { value: 'BOOKING_CANCELLED', label: 'Foglalás törlés' },
            { value: 'WAITLIST_AVAILABLE', label: 'Várólistáról értesítés' },
            { value: 'SYSTEM', label: 'Rendszer értesítés' },
            { value: 'DIGEST', label: 'Heti összefoglaló' },
            { value: 'ADMIN_BROADCAST', label: 'Admin közlemény' }
        ];

        const statuses = [
            { value: 'PENDING', label: 'Függőben' },
            { value: 'SENT', label: 'Elküldve' },
            { value: 'FAILED', label: 'Sikertelen' }
        ];

        res.json({ success: true, data: { types, statuses } });
    })
);
