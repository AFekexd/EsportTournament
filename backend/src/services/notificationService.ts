import prisma from '../lib/prisma.js';
import { discordService } from './discordService.js';

type NotificationType = 'TOURNAMENT_INVITE' | 'TEAM_INVITE' | 'MATCH_SCHEDULED' | 'MATCH_RESULT' | 'SYSTEM';

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    sendDiscord?: boolean;
}

class NotificationService {
    async createNotification(params: CreateNotificationParams) {
        const { userId, type, title, message, link, sendDiscord = false } = params;

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

        // Send Discord notification (for system-wide announcements)
        if (sendDiscord) {
            await discordService.sendSystemAnnouncement(title, message);
        }

        return notification;
    }

    async notifyTournamentInvite(userId: string, tournamentId: string, tournamentName: string) {
        await this.createNotification({
            userId,
            type: 'TOURNAMENT_INVITE',
            title: 'Verseny meghívó',
            message: `Meghívtak a következő versenyre: ${tournamentName}`,
            link: `/tournaments/${tournamentId}`,
        });
    }

    async notifyMatchScheduled(userId: string, matchDetails: { tournamentName: string; opponent: string; scheduledAt: Date; matchId: string }) {
        await this.createNotification({
            userId,
            type: 'MATCH_SCHEDULED',
            title: 'Meccs ütemezve',
            message: `Meccsed ${matchDetails.opponent} ellen: ${matchDetails.scheduledAt.toLocaleString('hu-HU')}`,
            link: `/tournaments/${matchDetails.matchId}`,
        });
    }

    async notifyMatchResult(userId: string, result: { tournamentName: string; won: boolean; score: string; tournamentId: string }) {
        await this.createNotification({
            userId,
            type: 'MATCH_RESULT',
            title: result.won ? 'Győzelem!' : 'Meccs vége',
            message: `${result.tournamentName}: ${result.score}`,
            link: `/tournaments/${result.tournamentId}`,
        });
    }

    async notifyAllUsersNewTournament(tournament: { id: string; name: string }) {
        // Fetch full tournament details (needed for game name)
        const fullTournament = await prisma.tournament.findUnique({
            where: { id: tournament.id },
            include: { game: true }
        });

        if (!fullTournament) {
            console.error('Tournament not found during broadcast:', tournament.id);
            return;
        }

        // Create Discord Channels (Text + Voice) under the Game's Category
        try {
            const channels = await discordService.createTournamentChannels(fullTournament.name, fullTournament.game.name);
            const discordChannelId = channels.textChannelId;

            if (discordChannelId) {
                // Update tournament with the new text channel ID
                await prisma.tournament.update({
                    where: { id: tournament.id },
                    data: { discordChannelId }
                });

                // Send announcement to the new channel
                await discordService.sendTournamentAnnouncement({
                    id: fullTournament.id,
                    name: fullTournament.name,
                    game: fullTournament.game.name,
                    startDate: fullTournament.startDate,
                    maxTeams: fullTournament.maxTeams,
                    imageUrl: fullTournament.imageUrl
                }, discordChannelId);
            }
        } catch (error) {
            console.error('Failed to setup Discord for tournament:', error);
        }

        console.log('✅ Tournament broadcast complete');
    }

    async notifyAllUsersNewGame(game: { id: string; name: string }) {
        const users = await prisma.user.findMany({
            select: { id: true }
        });

        console.log(`📢 Broadcasting new game notification to ${users.length} users...`);

        // Create notifications in chunks
        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            await Promise.all(chunk.map(user =>
                prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'SYSTEM',
                        title: 'Új játék!',
                        message: `Új játék érhető el: ${game.name}`,
                        link: `/games`,
                    }
                })
            ));
        }
    }

    async notifyAllUsersSystemMessage(title: string, message: string, link?: string) {
        const users = await prisma.user.findMany({
            select: { id: true }
        });

        console.log(`📢 Broadcasting system message to ${users.length} users...`);

        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);
            await Promise.all(chunk.map(user =>
                prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'SYSTEM',
                        title,
                        message,
                        link,
                    }
                })
            ));
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
        const homeTeamName = match.homeTeam?.name || match.homeUser?.displayName || match.homeUser?.username || 'Ismeretlen';
        const awayTeamName = match.awayTeam?.name || match.awayUser?.displayName || match.awayUser?.username || 'Ismeretlen';
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

        // Send to Discord if enabled and channel exists
        if (tournament.notifyDiscord && tournament.discordChannelId && tournament.discordChannelId !== 'matches') {
            await discordService.sendMatchResult({
                tournament: tournament.name,
                homeTeam: homeTeamName,
                awayTeam: awayTeamName,
                homeScore: match.homeScore || 0,
                awayScore: match.awayScore || 0,
                winner: (match.winner || match.winnerUser) ? (match.winner?.name || match.winnerUser?.username) : 'Döntetlen'
            }, tournament.discordChannelId);
        }

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

    async notifyTimeBalanceUpdate(userId: string, amount: number, _newBalance: number, reason: string) {
        const isPositive = amount >= 0;
        const title = isPositive ? 'Idő jóváírás' : 'Idő levonás';
        const absAmount = Math.abs(amount);
        const hours = Math.floor(absAmount / 3600);
        const minutes = Math.floor((absAmount % 3600) / 60);

        let amountText = '';
        if (hours > 0) amountText += `${hours} óra `;
        if (minutes > 0 || hours === 0) amountText += `${minutes} perc`;
        amountText = amountText.trim();

        const message = `${isPositive ? '+' : '-'}${amountText} - ${reason}`;

        // Create in-app notification
        await this.createNotification({
            userId,
            type: 'SYSTEM',
            title,
            message,
            link: '/profile', // Redirect to profile to see balance
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

    async deleteNotification(notificationId: string, userId: string) {
        return prisma.notification.deleteMany({
            where: {
                id: notificationId,
                userId,
            },
        });
    }

    async deleteAllNotifications(userId: string) {
        return prisma.notification.deleteMany({
            where: {
                userId,
            },
        });
    }
}

export const notificationService = new NotificationService();
