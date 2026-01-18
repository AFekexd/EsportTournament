/**
 * Discord Log Service
 * Logs all Discord bot activities to database for audit and analytics
 */

import prisma from '../lib/prisma.js';
import { DiscordLogType, DiscordLogStatus } from '../generated/prisma/client.js';

interface LogData {
    type: DiscordLogType;
    channelId?: string;
    messageId?: string;
    userId?: string;
    discordId?: string;
    content?: string;
    embedTitle?: string;
    status?: DiscordLogStatus;
    error?: string;
    metadata?: Record<string, any>;
}

class DiscordLogService {
    /**
     * Log a Discord activity
     */
    async log(data: LogData): Promise<void> {
        try {
            await prisma.discordLog.create({
                data: {
                    type: data.type,
                    channelId: data.channelId,
                    messageId: data.messageId,
                    userId: data.userId,
                    discordId: data.discordId,
                    content: data.content?.substring(0, 2000), // Limit content length
                    embedTitle: data.embedTitle,
                    status: data.status || 'SENT',
                    error: data.error,
                    metadata: data.metadata
                }
            });
        } catch (error) {
            console.error('Failed to log Discord activity:', error);
        }
    }

    /**
     * Log a successful message send
     */
    async logSuccess(
        type: DiscordLogType,
        channelId: string,
        messageId: string,
        embedTitle?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            type,
            channelId,
            messageId,
            embedTitle,
            status: 'SENT',
            metadata
        });
    }

    /**
     * Log a failed message send
     */
    async logError(
        type: DiscordLogType,
        error: string,
        channelId?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            type,
            channelId,
            status: 'FAILED',
            error,
            metadata
        });
    }

    /**
     * Log a command usage
     */
    async logCommand(
        commandName: string,
        discordId: string,
        userId?: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        await this.log({
            type: 'COMMAND_USAGE',
            discordId,
            userId,
            content: `/${commandName}`,
            status: 'SENT',
            metadata
        });
    }

    /**
     * Log a DM sent to user
     */
    async logDM(
        type: DiscordLogType,
        discordId: string,
        userId?: string,
        embedTitle?: string,
        success: boolean = true,
        error?: string
    ): Promise<void> {
        await this.log({
            type,
            discordId,
            userId,
            embedTitle,
            status: success ? 'SENT' : 'FAILED',
            error
        });
    }

    /**
     * Get Discord activity statistics
     */
    async getStats(days: number = 30): Promise<{
        total: number;
        sent: number;
        failed: number;
        byType: Array<{ type: DiscordLogType; count: number }>;
        last24h: number;
        last7d: number;
        last30d: number;
        commandUsage: Array<{ command: string; count: number }>;
    }> {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [total, sent, failed, last24hCount, last7dCount, last30dCount, byType, commands] = await Promise.all([
            prisma.discordLog.count(),
            prisma.discordLog.count({ where: { status: 'SENT' } }),
            prisma.discordLog.count({ where: { status: 'FAILED' } }),
            prisma.discordLog.count({ where: { createdAt: { gte: last24h } } }),
            prisma.discordLog.count({ where: { createdAt: { gte: last7d } } }),
            prisma.discordLog.count({ where: { createdAt: { gte: last30d } } }),
            prisma.discordLog.groupBy({
                by: ['type'],
                _count: true,
                orderBy: { _count: { type: 'desc' } }
            }),
            prisma.discordLog.findMany({
                where: { type: 'COMMAND_USAGE', createdAt: { gte: last30d } },
                select: { content: true }
            })
        ]);

        // Count command usage
        const commandCounts: Record<string, number> = {};
        commands.forEach(cmd => {
            const cmdName = cmd.content || 'unknown';
            commandCounts[cmdName] = (commandCounts[cmdName] || 0) + 1;
        });

        const commandUsage = Object.entries(commandCounts)
            .map(([command, count]) => ({ command, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            total,
            sent,
            failed,
            byType: byType.map(t => ({ type: t.type, count: t._count })),
            last24h: last24hCount,
            last7d: last7dCount,
            last30d: last30dCount,
            commandUsage
        };
    }

    /**
     * Get paginated logs
     */
    async getLogs(options: {
        page?: number;
        limit?: number;
        type?: DiscordLogType;
        status?: DiscordLogStatus;
        discordId?: string;
        userId?: string;
    } = {}): Promise<{
        logs: Array<any>;
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        const { page = 1, limit = 50, type, status, discordId, userId } = options;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (discordId) where.discordId = discordId;
        if (userId) where.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.discordLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true
                        }
                    }
                }
            }),
            prisma.discordLog.count({ where })
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get sync report - how many users have Discord linked
     */
    async getSyncReport(): Promise<{
        totalUsers: number;
        linkedUsers: number;
        unlinkedUsers: number;
        linkRate: number;
        recentLinks: Array<{ username: string; linkedAt: Date }>;
    }> {
        const [totalUsers, linkedUsers] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { discordId: { not: null } } })
        ]);

        const recentLinks = await prisma.user.findMany({
            where: { discordId: { not: null } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                username: true,
                updatedAt: true
            }
        });

        return {
            totalUsers,
            linkedUsers,
            unlinkedUsers: totalUsers - linkedUsers,
            linkRate: totalUsers > 0 ? Math.round((linkedUsers / totalUsers) * 100) : 0,
            recentLinks: recentLinks.map(u => ({ username: u.username, linkedAt: u.updatedAt }))
        };
    }
}

export const discordLogService = new DiscordLogService();
