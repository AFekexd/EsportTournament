/**
 * Admin Discord API Routes
 * Endpoints for Discord bot management and statistics
 */

import { Router, Response } from 'express';
import { discordLogService } from '../services/discordLogService.js';
import { discordService } from '../services/discordService.js';
import { matchReminderService } from '../services/matchReminderService.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { DiscordLogType, DiscordLogStatus } from '../generated/prisma/client.js';

export const adminDiscordRouter: Router = Router();

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
    '/announce',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { title, message, channelId, targetUserId } = req.body;
        const adminUser = (req as any).adminUser;

        if (!message) {
            throw new ApiError('Üzenet megadása kötelező', 400, 'MISSING_MESSAGE');
        }

        let success = false;

        if (targetUserId) {
            // Send DM to specific user
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId },
                select: { id: true, discordId: true, username: true, displayName: true }
            });

            if (!targetUser) {
                throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
            }

            if (!targetUser.discordId) {
                throw new ApiError('A felhasználónak nincs összekapcsolt Discord fiókja', 400, 'NO_DISCORD');
            }

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

        if (!success && targetUserId) {
             throw new ApiError('Nem sikerült elküldeni a privát üzenetet (lehet, hogy le van tiltva a DM)', 500, 'DM_FAILED');
        }

        res.json({
            success,
            message: success ? 'Üzenet elküldve' : 'Nem sikerült elküldeni az üzenetet'
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

/**
 * GET /api/admin/discord/match-checkins/:matchId
 * Get check-in status for a match
 */
adminDiscordRouter.get(
    '/match-checkins/:matchId',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const matchId = req.params.matchId as string;
        
        const status = await matchReminderService.getCheckInStatus(matchId);
        
        res.json({
            success: true,
            data: status
        });
    })
);

/**
 * GET /api/admin/discord/predictions/:matchId
 * Get predictions for a match
 */
adminDiscordRouter.get(
    '/predictions/:matchId',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const matchId = req.params.matchId as string;
        
        const predictions = await prisma.matchPrediction.findMany({
            where: { matchId },
            include: {
                predictor: {
                    select: { displayName: true, username: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json({
            success: true,
            data: predictions.map(p => ({
                id: p.id,
                predictor: p.predictor.displayName || p.predictor.username,
                predictedHomeScore: p.predictedHomeScore,
                predictedAwayScore: p.predictedAwayScore,
                points: p.points,
                isCorrect: p.isCorrect,
                createdAt: p.createdAt
            }))
        });
    })
);

/**
 * POST /api/admin/discord/calculate-predictions/:matchId
 * Calculate prediction points for a completed match
 */
adminDiscordRouter.post(
    '/calculate-predictions/:matchId',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const matchId = req.params.matchId as string;

        const match = await prisma.match.findUnique({
            where: { id: matchId },
            select: {
                status: true,
                homeScore: true,
                awayScore: true,
                winnerUserId: true,
                winnerId: true
            }
        });

        if (!match) {
            throw new ApiError('Meccs nem található', 404, 'MATCH_NOT_FOUND');
        }

        if (match.status !== 'COMPLETED') {
            throw new ApiError('A meccs még nem fejeződött be', 400, 'MATCH_NOT_COMPLETED');
        }

        const predictions = await prisma.matchPrediction.findMany({
            where: { matchId }
        });

        let exactPredictions = 0;
        let winnerPredictions = 0;
        let wrongPredictions = 0;

        for (const pred of predictions) {
            let points = 0;
            let isCorrect = false;

            // Exact score match = 10 points
            if (pred.predictedHomeScore === match.homeScore && pred.predictedAwayScore === match.awayScore) {
                points = 10;
                isCorrect = true;
                exactPredictions++;
            }
            // Correct winner = 3 points
            else {
                const actualWinnerId = match.winnerId || match.winnerUserId;
                if (pred.predictedWinnerId && pred.predictedWinnerId === actualWinnerId) {
                    points = 3;
                    isCorrect = true;
                    winnerPredictions++;
                } else {
                    wrongPredictions++;
                }
            }

            await prisma.matchPrediction.update({
                where: { id: pred.id },
                data: { points, isCorrect }
            });
        }

        res.json({
            success: true,
            data: {
                total: predictions.length,
                exactPredictions,
                winnerPredictions,
                wrongPredictions
            },
            message: `${predictions.length} tipp kiértékelve`
        });
    })
);
