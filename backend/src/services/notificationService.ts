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

    async notifyAllUsersNewTournament(tournament: { id: string; name: string }) {
        // 1. Create Discord Channel for the tournament
        // 1. Fetch full tournament details FIRST (needed for game name)
        const fullTournament = await prisma.tournament.findUnique({
            where: { id: tournament.id },
            include: { game: true }
        });

        if (!fullTournament) {
            console.error('Tournament not found during broadcast:', tournament.id);
            return;
        }

        // 2. Create Discord Channels (Text + Voice) under the Game's Category
        let discordChannelId: string | null = null;
        try {
            const channels = await discordService.createTournamentChannels(fullTournament.name, fullTournament.game.name);
            discordChannelId = channels.textChannelId;

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
                    maxTeams: fullTournament.maxTeams
                }, discordChannelId);
            }
        } catch (error) {
            console.error('Failed to setup Discord for tournament:', error);
        }

        // Fetch all users
        const users = await prisma.user.findMany({
            select: { id: true, email: true, emailNotifications: true }
        });

        console.log(`📢 Broadcasting new tournament notification to ${users.length} users...`);

        // Create in-app notifications and send emails in parallel chunks
        const chunkSize = 50;
        for (let i = 0; i < users.length; i += chunkSize) {
            const chunk = users.slice(i, i + chunkSize);

            await Promise.all(chunk.map(async (user) => {
                // 1. Create in-app notification
                await prisma.notification.create({
                    data: {
                        userId: user.id,
                        type: 'SYSTEM',
                        title: 'Új verseny!',
                        message: `Hamarosan kezdődik: ${tournament.name}`,
                        link: `/tournaments/${tournament.id}`,
                    },
                });

                // 2. Send email if enabled
                if (user.emailNotifications && user.email) {
                    await emailService.sendNewTournamentNotification(user.email, tournament.name, tournament.id);
                }
            }));
        }

        console.log('✅ Broadcast complete');
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
            await Promise.all(chunk.map(userId =>
                prisma.notification.create({
                    data: {
                        userId: userId.id,
                        type: 'SYSTEM',
                        title: 'Új játék!',
                        message: `Új játék érhető el: ${game.name}`,
                        link: `/games`, // Or specific game link if page exists
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
            await Promise.all(chunk.map(userId =>
                prisma.notification.create({
                    data: {
                        userId: userId.id,
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
