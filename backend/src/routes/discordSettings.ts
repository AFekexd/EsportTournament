import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { discordService } from '../services/discordService.js';
import prisma from '../lib/prisma.js';

export const discordRouter = Router();

// Get available Discord channels
discordRouter.get(
    '/channels',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const channels = await discordService.getAvailableChannels();

        const channelInfo = channels.map(channel => ({
            id: channel.id,
            name: channel.name, // Use actual channel name
            icon: '📝', // Default icon for text channels
        }));

        res.json({
            success: true,
            data: channelInfo,
        });
    })
);

// Search for users and teams for mentions
discordRouter.get(
    '/search-mentions',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.json({ success: true, data: [] });
        }

        const searchTerm = query.toLowerCase();

        // Search users
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { username: { contains: searchTerm, mode: 'insensitive' } },
                    { displayName: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                username: true,
                displayName: true,
            },
            take: 5,
        });

        // Search teams
        const teams = await prisma.team.findMany({
            where: {
                name: { contains: searchTerm, mode: 'insensitive' },
            },
            select: {
                id: true,
                name: true,
            },
            take: 5,
        });

        // Search Discord members
        const discordMembers = await discordService.searchGuildMembers(searchTerm);

        const results = [
            ...discordMembers.map(member => ({
                type: 'discord_user',
                id: member.id,
                name: member.displayName || member.username,
                username: member.username,
                avatar: member.avatarUrl,
                mention: `<@${member.id}>`,
            })),
            ...users.map((user: { id: string; username: string; displayName: string | null }) => ({
                type: 'user',
                id: user.id,
                name: user.displayName || user.username,
                mention: `@${user.username}`, // Fallback for website users not linked
            })),
            ...teams.map((team: { id: string; name: string }) => ({
                type: 'team',
                id: team.id,
                name: team.name,
                mention: `@${team.name}`, // Fallback/Role mention if roles match team names
            })),
        ];

        res.json({
            success: true,
            data: results,
        });
    })
);

// Send custom Discord message (Admin/Organizer only)
discordRouter.post(
    '/send',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const keycloakId = req.user!.sub;

        // Fetch user from database to get role
        const user = await prisma.user.findUnique({
            where: { keycloakId },
            select: { id: true, role: true, username: true },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: 'Felhasználó nem található' },
            });
        }

        // Check if user has permission
        const allowedRoles = ['ADMIN', 'ORGANIZER', 'MODERATOR', 'TEACHER'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({
                success: false,
                error: { message: 'Nincs jogosultságod Discord üzenet küldésére' },
            });
        }

        const { title, message, color, mentions, channel = 'general' } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: { message: 'Cím és üzenet megadása kötelező' },
            });
        }

        // Prepare message content with mentions
        let content = '';
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
            content = mentions.join(' ') + '\n';
        }

        // Send to Discord
        await discordService.sendMessage(channel, {
            title,
            description: message,
            color: color ? parseInt(color.replace('#', ''), 16) : 0x8b5cf6,
            timestamp: new Date().toISOString(),
        }, content);

        res.json({
            success: true,
            data: { message: 'Discord üzenet sikeresen elküldve' },
        });
    })
);

// Helper functions
function getChannelDisplayName(channel: string): string {
    const names: Record<string, string> = {
        announcements: '📢 Hirdetmények',
        tournaments: '🏆 Versenyek',
        matches: '⚔️ Meccsek',
        general: '💬 Általános',
    };
    return names[channel] || channel;
}

function getChannelIcon(channel: string): string {
    const icons: Record<string, string> = {
        announcements: '📢',
        tournaments: '🏆',
        matches: '⚔️',
        general: '💬',
    };
    return icons[channel] || '📝';
}
