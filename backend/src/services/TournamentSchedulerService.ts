import prisma from '../lib/prisma.js';
import { discordService } from './discordService.js';
import { notificationService } from './notificationService.js';
import { discordLogService } from './discordLogService.js';

// Track sent reminders to avoid duplicates
const sentReminders = new Set<string>();

export class TournamentSchedulerService {
    // Check every minute
    private static CHECK_INTERVAL_MS = 60 * 1000;

    static async startScheduler() {
        console.log('🏆 Tournament Scheduler started...');

        // Initial check
        await this.updateStatuses();

        // Periodic check
        setInterval(() => this.updateStatuses(), this.CHECK_INTERVAL_MS);
        
        // Check registration deadlines every 5 minutes
        setInterval(() => this.checkRegistrationDeadlines(), 5 * 60 * 1000);
        
        // Weekly standings - every Sunday at 18:00
        this.scheduleWeeklyStandings();
    }

    private static async updateStatuses() {
        try {
            const now = new Date();

            // 1. Start Tournaments: REGISTRATION/DRAFT -> IN_PROGRESS
            // Conditions: Status is REGISTRATION or DRAFT and startDate has passed
            const tournamentsToStart = await prisma.tournament.findMany({
                where: {
                    status: { in: ['REGISTRATION', 'DRAFT'] },
                    startDate: {
                        lte: now
                    }
                }
            });

            for (const tournament of tournamentsToStart) {
                console.log(`[Scheduler] Starting tournament: ${tournament.name} (${tournament.id})`);

                // Update status
                await prisma.tournament.update({
                    where: { id: tournament.id },
                    data: { status: 'IN_PROGRESS' }
                });

                // Notify Discord
                if (tournament.notifyDiscord) {
                    await discordService.sendSystemAnnouncement(
                        '🏆 Verseny Elindult!',
                        `A(z) **${tournament.name}** verseny hivatalosan elindult! Sok sikert minden résztvevőnek!`
                    );
                }

                // Notify Users (Participants)
                if (tournament.notifyUsers) {
                    const entries = await prisma.tournamentEntry.findMany({
                        where: { tournamentId: tournament.id },
                        select: { userId: true, team: { select: { members: { select: { userId: true } } } } }
                    });

                    const userIds = new Set<string>();
                    entries.forEach(entry => {
                        if (entry.userId) userIds.add(entry.userId);
                        if (entry.team) {
                            entry.team.members.forEach(m => userIds.add(m.userId));
                        }
                    });

                    // Batch notification (could be optimized)
                    for (const userId of userIds) {
                        await notificationService.notifySystem(
                            userId,
                            'Verseny Elindult',
                            `A(z) ${tournament.name} verseny elindult!`,
                            `/tournaments/${tournament.id}`
                        );
                    }
                }
            }

            // 2. End Tournaments: IN_PROGRESS -> COMPLETED
            // Conditions: Status is IN_PROGRESS and endDate has passed (and endDate is set)
            const tournamentsToEnd = await prisma.tournament.findMany({
                where: {
                    status: 'IN_PROGRESS',
                    endDate: {
                        not: null,
                        lte: now
                    }
                }
            });

            for (const tournament of tournamentsToEnd) {
                console.log(`[Scheduler] Ending tournament: ${tournament.name} (${tournament.id})`);

                // Update status
                await prisma.tournament.update({
                    where: { id: tournament.id },
                    data: { status: 'COMPLETED' }
                });

                // Notify Discord
                if (tournament.notifyDiscord) {
                    await discordService.sendSystemAnnouncement(
                        '🏁 Verseny Lezárult',
                        `A(z) **${tournament.name}** verseny véget ért. Gratulálunk a győzteseknek!`
                    );
                }

                // Notify Users? Maybe less critical here, match results usually signal end.
            }

        } catch (error) {
            console.error('[Scheduler] Error updating tournament statuses:', error);
        }
    }

    /**
     * Check for upcoming registration deadlines and send reminders
     */
    private static async checkRegistrationDeadlines() {
        try {
            const now = new Date();
            const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const in1h = new Date(now.getTime() + 60 * 60 * 1000);

            // Find tournaments with registration deadline in next 24 hours
            const tournamentsEnding = await prisma.tournament.findMany({
                where: {
                    status: 'REGISTRATION',
                    registrationDeadline: {
                        gte: now,
                        lte: in24h
                    }
                },
                include: {
                    game: true,
                    _count: { select: { entries: true } }
                }
            });

            for (const tournament of tournamentsEnding) {
                const hoursLeft = Math.round((tournament.registrationDeadline.getTime() - now.getTime()) / (60 * 60 * 1000));
                
                // Check which reminder to send
                let reminderType: '24h' | '1h' | null = null;
                if (hoursLeft <= 1 && hoursLeft > 0) {
                    reminderType = '1h';
                } else if (hoursLeft <= 24 && hoursLeft > 1) {
                    reminderType = '24h';
                }

                if (!reminderType) continue;

                const reminderKey = `${tournament.id}-deadline-${reminderType}`;
                if (sentReminders.has(reminderKey)) continue;

                console.log(`[Scheduler] Sending ${reminderType} registration deadline reminder for: ${tournament.name}`);

                // Send Discord announcement
                if (tournament.notifyDiscord && tournament.discordChannelId) {
                    await discordService.sendMessage(tournament.discordChannelId, {
                        title: reminderType === '1h' ? '⚠️ Utolsó Esély!' : '📢 Regisztráció Hamarosan Zárul',
                        description: `A(z) **${tournament.name}** verseny regisztrációja ${reminderType === '1h' ? '1 órán' : '24 órán'} belül zárul!`,
                        color: reminderType === '1h' ? 0xef4444 : 0xf59e0b,
                        fields: [
                            { name: '🎮 Játék', value: tournament.game.name, inline: true },
                            { name: '👥 Résztvevők', value: `${tournament._count.entries}/${tournament.maxTeams}`, inline: true },
                            { name: '⏰ Határidő', value: tournament.registrationDeadline.toLocaleString('hu-HU'), inline: true },
                            { name: '🔗 Link', value: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournament.id}`, inline: false }
                        ],
                        timestamp: now.toISOString()
                    });

                    await discordLogService.logSuccess(
                        'REGISTRATION_REMINDER',
                        tournament.discordChannelId,
                        '',
                        `Registration deadline ${reminderType} reminder`,
                        { tournamentId: tournament.id, hoursLeft }
                    );
                }

                sentReminders.add(reminderKey);
            }

        } catch (error) {
            console.error('[Scheduler] Error checking registration deadlines:', error);
        }
    }

    /**
     * Schedule weekly standings announcement
     */
    private static scheduleWeeklyStandings() {
        const checkWeekly = async () => {
            const now = new Date();
            // Sunday at 18:00
            if (now.getDay() === 0 && now.getHours() === 18 && now.getMinutes() === 0) {
                await this.announceWeeklyStandings();
            }
        };

        // Check every minute
        setInterval(checkWeekly, 60 * 1000);
    }

    /**
     * Announce weekly standings for active tournaments
     */
    private static async announceWeeklyStandings() {
        try {
            const activeTournaments = await prisma.tournament.findMany({
                where: { status: 'IN_PROGRESS' },
                include: { game: true }
            });

            for (const tournament of activeTournaments) {
                if (!tournament.notifyDiscord || !tournament.discordChannelId) continue;

                // Get top 5 standings
                const entries = await prisma.tournamentEntry.findMany({
                    where: { tournamentId: tournament.id },
                    include: {
                        team: { select: { name: true, elo: true } },
                        user: { select: { displayName: true, username: true, elo: true } }
                    },
                    orderBy: { qualifierPoints: 'desc' },
                    take: 5
                });

                if (entries.length === 0) continue;

                const standings = entries.map((e, i) => {
                    const name = e.team?.name || e.user?.displayName || e.user?.username || 'Unknown';
                    const points = e.qualifierPoints || 0;
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                    return `${medal} ${name} - ${points} pont`;
                }).join('\n');

                await discordService.sendMessage(tournament.discordChannelId, {
                    title: '📊 Heti Állás',
                    description: `**${tournament.name}** - ${tournament.game.name}`,
                    color: 0x8b5cf6,
                    fields: [
                        { name: 'Top 5', value: standings, inline: false }
                    ],
                    timestamp: new Date().toISOString()
                });

                await discordLogService.logSuccess(
                    'WEEKLY_STANDINGS',
                    tournament.discordChannelId,
                    '',
                    'Weekly standings announcement',
                    { tournamentId: tournament.id }
                );
            }
        } catch (error) {
            console.error('[Scheduler] Error announcing weekly standings:', error);
        }
    }
}

