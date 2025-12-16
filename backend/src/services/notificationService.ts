import prisma from '../lib/prisma.js';
import { emailService } from './emailService.js';
import { discordService } from './discordService.js';

type NotificationType = 'TOURNAMENT_INVITE' | 'TEAM_INVITE' | 'MATCH_SCHEDULED' | 'MATCH_RESULT' | 'SYSTEM';

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    sendEmail?: boolean;
    sendDiscord?: boolean;
}

class NotificationService {
    async createNotification(params: CreateNotificationParams) {
        const { userId, type, title, message, link, sendEmail = false, sendDiscord = false } = params;

        // Create in-app notification
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                link,
            },
        });

        // Get user for email
        if (sendEmail) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true },
            });

            if (user?.email) {
                await emailService.sendSystemNotification(user.email, title, message);
            }
        }

        // Send Discord notification (for system-wide announcements)
        if (sendDiscord) {
            await discordService.sendSystemAnnouncement(title, message);
        }

        return notification;
    }

    async notifyTournamentInvite(userId: string, tournamentId: string, tournamentName: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        await this.createNotification({
            userId,
            type: 'TOURNAMENT_INVITE',
            title: 'Verseny meghívó',
            message: `Meghívtak a következő versenyre: ${tournamentName}`,
            link: `/tournaments/${tournamentId}`,
        });

        if (user?.email) {
            await emailService.sendTournamentInvite(user.email, tournamentName, tournamentId);
        }
    }

    async notifyMatchScheduled(userId: string, matchDetails: { tournamentName: string; opponent: string; scheduledAt: Date; matchId: string }) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        await this.createNotification({
            userId,
            type: 'MATCH_SCHEDULED',
            title: 'Meccs ütemezve',
            message: `Meccsed ${matchDetails.opponent} ellen: ${matchDetails.scheduledAt.toLocaleString('hu-HU')}`,
            link: `/tournaments/${matchDetails.matchId}`,
        });

        if (user?.email) {
            await emailService.sendMatchReminder(user.email, {
                tournament: matchDetails.tournamentName,
                opponent: matchDetails.opponent,
                scheduledAt: matchDetails.scheduledAt,
            });
        }
    }

    async notifyMatchResult(userId: string, result: { tournamentName: string; won: boolean; score: string; tournamentId: string }) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });

        await this.createNotification({
            userId,
            type: 'MATCH_RESULT',
            title: result.won ? 'Győzelem!' : 'Meccs vége',
            message: `${result.tournamentName}: ${result.score}`,
            link: `/tournaments/${result.tournamentId}`,
        });

        if (user?.email) {
            await emailService.sendMatchResult(user.email, {
                tournament: result.tournamentName,
                won: result.won,
                score: result.score,
            });
        }
    }

    async notifyMatchResultToTeams(match: any, tournament: any) {
        if (!tournament.notifyUsers) return;

        const isSoloMatch = !!(match.homeUserId || match.awayUserId);
        const userIds: string[] = [];

        if (isSoloMatch) {
            // Solo match - notify both players
            if (match.homeUserId) userIds.push(match.homeUserId);
            if (match.awayUserId) userIds.push(match.awayUserId);
        } else {
            // Team match - notify all team members
            const teams = await prisma.team.findMany({
                where: {
                    id: { in: [match.homeTeamId, match.awayTeamId].filter(Boolean) },
                },
                include: {
                    members: {
                        select: { userId: true },
                    },
                },
            });

            teams.forEach((team: { members: { userId: string }[] }) => {
                team.members.forEach((member: { userId: string }) => {
                    userIds.push(member.userId);
                });
            });
        }

        // Create notifications for all participants
        const homeTeamName = match.homeTeam?.name || match.homeUser?.displayName || match.homeUser?.username || 'TBD';
        const awayTeamName = match.awayTeam?.name || match.awayUser?.displayName || match.awayUser?.username || 'TBD';
        const score = `${homeTeamName} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${awayTeamName}`;

        await Promise.all(
            userIds.map(userId =>
                this.createNotification({
                    userId,
                    type: 'MATCH_RESULT',
                    title: 'Meccs eredmény',
                    message: `${tournament.name}: ${score}`,
                    link: `/tournaments/${tournament.id}`,
                })
            )
        );

        console.log(`📧 Sent ${userIds.length} match result notifications`);
    }

    async notifyTeamInvite(userId: string, teamId: string, teamName: string) {
        await this.createNotification({
            userId,
            type: 'TEAM_INVITE',
            title: 'Csapat meghívó',
            message: `Meghívtak a következő csapatba: ${teamName}`,
            link: `/teams/${teamId}`,
        });
    }

    async notifySystem(userId: string, title: string, message: string, link?: string) {
        await this.createNotification({
            userId,
            type: 'SYSTEM',
            title,
            message,
            link,
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        return prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId, // Ensure user owns this notification
            },
            data: {
                read: true,
            },
        });
    }

    async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: {
                userId,
                read: false,
            },
            data: {
                read: true,
            },
        });
    }

    async getUserNotifications(userId: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where: { userId } }),
        ]);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async getUnreadCount(userId: string) {
        return prisma.notification.count({
            where: {
                userId,
                read: false,
            },
        });
    }
}

export const notificationService = new NotificationService();
