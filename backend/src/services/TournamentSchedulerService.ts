import prisma from '../lib/prisma.js';
import { discordService } from './discordService.js';
import { notificationService } from './notificationService.js';

export class TournamentSchedulerService {
    // Check every minute
    private static CHECK_INTERVAL_MS = 60 * 1000;

    static async startScheduler() {
        console.log('🏆 Tournament Scheduler started...');

        // Initial check
        await this.updateStatuses();

        // Periodic check
        setInterval(() => this.updateStatuses(), this.CHECK_INTERVAL_MS);
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
}
