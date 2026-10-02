/**
 * Admin Discord API Routes
 * Endpoints for Discord bot management and statistics
 */

import { Router, Response } from 'express';
import crypto from 'crypto';
import { discordLogService } from '../services/discordLogService.js';
import { discordService } from '../services/discordService.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { DiscordLogType, DiscordLogStatus, EmailType } from '../generated/prisma/client.js';
import { emailService } from '../services/emailService.js';
import { announcementTemplate } from '../services/emailTemplates.js';

export const adminDiscordRouter: Router = Router();
const BOT_RELAY_CHANNEL_ID = '1496789752098328667';
const DISCORD_WEBHOOK_API_KEY = process.env.DISCORD_WEBHOOK_API_KEY || '';

function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);

    if (aBuf.length !== bBuf.length) {
        return false;
    }

    return crypto.timingSafeEqual(aBuf, bBuf);
}

function buildRelayMessage(body: any): string {
    const { text, message, sender } = body || {};
    const senderName =
        typeof sender?.name === 'string' && sender.name.trim().length > 0
            ? sender.name.trim()
            : 'RENDSZER';

    const messageText =
        typeof message === 'string' && message.trim().length > 0
            ? message.trim()
            : typeof text === 'string' && text.trim().length > 0
                ? text.trim()
                : '';

    if (!messageText) {
        throw new ApiError('A message vagy text mező kötelező', 400, 'MISSING_MESSAGE');
    }

    return typeof text === 'string' && text.trim().length > 0
        ? text.trim()
        : `**${senderName}**: ${messageText}`;
}

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
 * GET /api/admin/discord/stats
 * Get Discord bot activity statistics
 */
adminDiscordRouter.get(
    '/stats',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const days = parseInt(req.query.days as string) || 30;
        const stats = await discordLogService.getStats(days);
        
        res.json({
            success: true,
            data: stats
        });
    })
);

/**
 * GET /api/admin/discord/logs
 * Get paginated Discord activity logs
 */
adminDiscordRouter.get(
    '/logs',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const type = req.query.type as DiscordLogType | undefined;
        const status = req.query.status as DiscordLogStatus | undefined;
        const discordId = req.query.discordId as string | undefined;
        const userId = req.query.userId as string | undefined;

        const result = await discordLogService.getLogs({
            page,
            limit,
            type,
            status,
            discordId,
            userId
        });

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });
    })
);

/**
 * GET /api/admin/discord/sync-report
 * Get user sync status report
 */
adminDiscordRouter.get(
    '/sync-report',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const report = await discordLogService.getSyncReport();
        
        res.json({
            success: true,
            data: report
        });
    })
);

/**
 * GET /api/admin/discord/types
 * Get available log types for filtering
 */
adminDiscordRouter.get(
    '/types',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const types = [
            { value: 'TOURNAMENT_ANNOUNCE', label: 'Verseny bejelentés' },
            { value: 'MATCH_REMINDER', label: 'Meccs emlékeztető' },
            { value: 'MATCH_RESULT', label: 'Meccs eredmény' },
            { value: 'SYSTEM_ANNOUNCE', label: 'Rendszerüzenet' },
            { value: 'CHECK_IN_REQUEST', label: 'Check-in kérés' },
            { value: 'REGISTRATION_REMINDER', label: 'Regisztráció emlékeztető' },
            { value: 'WEEKLY_STANDINGS', label: 'Heti ranglista' },
            { value: 'ACHIEVEMENT', label: 'Achievement' },
            { value: 'PREDICTION', label: 'Tipp' },
            { value: 'DM_NOTIFICATION', label: 'DM értesítés' },
            { value: 'COMMAND_USAGE', label: 'Parancs használat' },
            { value: 'ERROR', label: 'Hiba' }
        ];

        const statuses = [
            { value: 'SENT', label: 'Elküldve' },
            { value: 'FAILED', label: 'Sikertelen' },
            { value: 'PENDING', label: 'Függőben' }
        ];

        res.json({
            success: true,
            data: { types, statuses }
        });
    })
);

/**
 * POST /api/admin/discord/announce
 * Send announcement to Discord channel
 */
adminDiscordRouter.post(
    '/bot-relay-webhook',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        if (!DISCORD_WEBHOOK_API_KEY) {
            throw new ApiError('DISCORD_WEBHOOK_API_KEY nincs beállítva', 503, 'WEBHOOK_NOT_CONFIGURED');
        }

        const apiKey = req.header('x-api-key') || '';
        if (!apiKey || !safeEqual(apiKey, DISCORD_WEBHOOK_API_KEY)) {
            throw new ApiError('Érvénytelen webhook API kulcs', 401, 'INVALID_WEBHOOK_KEY');
        }

        const outgoing = buildRelayMessage(req.body);
        const sent = await discordService.sendPlainText(BOT_RELAY_CHANNEL_ID, outgoing);

        if (!sent) {
            throw new ApiError('Nem sikerült Discord üzenetet küldeni', 500, 'DISCORD_SEND_FAILED');
        }

        res.json({
            success: true,
            data: {
                channelId: BOT_RELAY_CHANNEL_ID,
                sentMessage: outgoing
            }
        });
    })
);

adminDiscordRouter.post(
    '/bot-relay',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { channelId } = req.body || {};
        const targetChannelId = channelId || BOT_RELAY_CHANNEL_ID;
        const outgoing = buildRelayMessage(req.body);

        const sent = await discordService.sendPlainText(targetChannelId, outgoing);

        if (!sent) {
            throw new ApiError('Nem sikerült Discord üzenetet küldeni', 500, 'DISCORD_SEND_FAILED');
        }

        res.json({
            success: true,
            data: {
                channelId: targetChannelId,
                sentMessage: outgoing
            }
        });
    })
);

adminDiscordRouter.post(
    '/announce',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { title, message, channelId, targetUserId, channels = ['discord'] } = req.body;
        const adminUser = (req as any).adminUser;

        if (!message) {
            throw new ApiError('Üzenet megadása kötelező', 400, 'MISSING_MESSAGE');
        }

        const results = {
            discord: false,
            email: false,
            errors: [] as string[]
        };

        // --- DISCORD LOGIC ---
        if (channels.includes('discord')) {
            let success = false;
            
            if (targetUserId) {
                // Send DM to specific user
                const targetUser = await prisma.user.findUnique({
                    where: { id: targetUserId },
                    select: { id: true, discordId: true, username: true, displayName: true }
                });

                if (targetUser?.discordId) {
                    success = await discordService.sendDM(targetUser.discordId, {
                        title: title || 'Privát Rendszerüzenet',
                        description: `${message}\n\n*Küldte: ${adminUser.username}*`,
                        color: 0x3b82f6,
                        timestamp: new Date().toISOString()
                    });

                    if (success) {
                        await logSystemActivity(
                            'DISCORD_ANNOUNCE',
                            `Admin ${adminUser.username} sent DM to ${targetUser.username}: "${title || 'Privát Üzenet'}"`,
                            { adminId: adminUser.id, metadata: { targetUserId, messageLength: message.length } }
                        );
                    }
                } else {
                    results.errors.push('A felhasználónak nincs összekapcsolt Discord fiókja');
                }
            } else {
                // Broadcast to channel
                success = await discordService.sendSystemAnnouncement(
                    title || 'Rendszerüzenet',
                    message,
                    channelId
                );

                if (success) {
                    await logSystemActivity(
                        'DISCORD_ANNOUNCE',
                        `Admin ${adminUser.username} sent Discord announcement: "${title || 'Rendszerüzenet'}"`,
                        { adminId: adminUser.id, metadata: { channelId, messageLength: message.length } }
                    );
                }
            }
            results.discord = success;
        }

        // --- EMAIL LOGIC ---
        if (channels.includes('email')) {
             const subject = title || 'Rendszerüzenet';
             const htmlContent = announcementTemplate(subject, message, adminUser.username);
             
             if (targetUserId) {
                 const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { email: true } });
                 if (targetUser?.email) {
                     results.email = await emailService.sendEmail({
                         to: targetUser.email,
                         subject,
                         html: htmlContent,
                         type: 'SYSTEM'
                     });
                 } else {
                     results.errors.push('A felhasználónak nincs email címe');
                 }
             } else {
                 // Broadcast - Send to those enabled system notifications
                 const users = await prisma.user.findMany({
                     where: { emailNotifications: true, emailPrefSystem: true },
                     select: { email: true }
                 });
                 
                 let sentCount = 0;
                 for (const u of users) {
                     if (u.email) {
                         const sent = await emailService.sendEmail({
                             to: u.email,
                             subject,
                             html: htmlContent,
                             type: 'ADMIN_BROADCAST'
                         });
                         if (sent) sentCount++;
                     }
                 }
                 results.email = sentCount > 0;
                 
                 await logSystemActivity(
                    'SYSTEM_ANNOUNCE' as any, // Using SYSTEM_ANNOUNCE logging
                    `Admin ${adminUser.username} sent Email broadcast to ${sentCount} users`,
                    { adminId: adminUser.id, metadata: { recipientCount: sentCount, subject } }
                );
             }
        }

        res.json({
            success: true,
            results,
            message: 'Üzenet küldése feldolgozva.'
        });
    })
);

/**
 * POST /api/admin/discord/sync-user/:userId
 * Manually sync a user's Discord roles/nickname
 */
adminDiscordRouter.post(
    '/sync-user/:userId',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, discordId: true, displayName: true, username: true }
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        if (!user.discordId) {
            throw new ApiError('A felhasználónak nincs összekapcsolt Discord fiókja', 400, 'NO_DISCORD');
        }

        const result = await discordService.syncUser(userId);

        res.json({
            success: result.success,
            data: result,
            message: result.success 
                ? `${user.displayName || user.username} sikeresen szinkronizálva`
                : result.message || 'Szinkronizálás sikertelen'
        });
    })
);

/**
 * POST /api/admin/discord/sync-all
 * Sync all users with Discord
 */
adminDiscordRouter.post(
    '/sync-all',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const adminUser = (req as any).adminUser;

        const users = await prisma.user.findMany({
            where: { discordId: { not: null } },
            select: { id: true }
        });

        let synced = 0;
        let failed = 0;

        for (const user of users) {
            try {
                const result = await discordService.syncUser(user.id);
                if (result.success) synced++;
                else failed++;
            } catch (e) {
                failed++;
            }
        }

        await logSystemActivity(
            'DISCORD_SYNC_ALL',
            `Admin ${adminUser.username} triggered bulk Discord sync: ${synced} success, ${failed} failed`,
            { adminId: adminUser.id, metadata: { synced, failed, total: users.length } }
        );

        res.json({
            success: true,
            data: {
                total: users.length,
                synced,
                failed
            },
            message: `Szinkronizálás kész: ${synced} sikeres, ${failed} sikertelen`
        });
    })
);

/**
 * GET /api/admin/discord/channels
 * Get available Discord channels
 */
adminDiscordRouter.get(
    '/channels',
    authenticate,
    requireAdmin,
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const channels = await discordService.getAvailableChannels();
        
        res.json({
            success: true,
            data: channels
        });
    })
);
