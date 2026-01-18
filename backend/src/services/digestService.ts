/**
 * Digest Email Service
 * Handles weekly summary emails for users
 */

import prisma from '../lib/prisma.js';
import { emailService } from './emailService.js';

class DigestService {
    private intervalId: NodeJS.Timeout | null = null;

    /**
     * Start the weekly digest scheduler
     * Runs every Sunday at 18:00
     */
    startScheduler() {
        console.log('📧 Digest email scheduler started');

        // Check every hour if it's time to send digests
        this.intervalId = setInterval(async () => {
            const now = new Date();
            // Sunday = 0, and we want to send at 18:00
            if (now.getDay() === 0 && now.getHours() === 18 && now.getMinutes() < 5) {
                console.log('📧 Running weekly digest emails...');
                await this.sendWeeklyDigestToAll();
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        return this;
    }

    /**
     * Stop the scheduler
     */
    stopScheduler() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Send weekly digest to all subscribed users
     */
    async sendWeeklyDigestToAll(): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;

        try {
            // Get all users who want weekly digests
            const users = await prisma.user.findMany({
                where: {
                    emailNotifications: true,
                    emailPrefWeeklyDigest: true
                },
                select: {
                    id: true,
                    email: true,
                    displayName: true,
                    username: true
                }
            });

            console.log(`📧 Sending weekly digest to ${users.length} users...`);

            // Get upcoming tournaments for the next week
            const now = new Date();
            const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const upcomingTournaments = await prisma.tournament.findMany({
                where: {
                    startDate: {
                        gte: now,
                        lte: nextWeek
                    },
                    status: { in: ['REGISTRATION', 'IN_PROGRESS'] }
                },
                select: {
                    id: true,
                    name: true,
                    startDate: true
                },
                orderBy: { startDate: 'asc' },
                take: 5
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const tournamentsForEmail = upcomingTournaments.map(t => ({
                name: t.name,
                startDate: t.startDate,
                url: `${frontendUrl}/tournaments/${t.id}`
            }));

            // Process users in batches
            const batchSize = 10;
            for (let i = 0; i < users.length; i += batchSize) {
                const batch = users.slice(i, i + batchSize);

                await Promise.all(batch.map(async (user) => {
                    try {
                        // Get user's match stats for the past week
                        const stats = await this.getUserWeeklyStats(user.id);

                        const success = await emailService.sendWeeklyDigest(
                            user.email,
                            user.displayName || user.username,
                            tournamentsForEmail,
                            stats,
                            user.id
                        );

                        if (success) {
                            sent++;
                        } else {
                            failed++;
                        }
                    } catch (error) {
                        console.error(`Failed to send digest to ${user.email}:`, error);
                        failed++;
                    }
                }));

                // Small delay between batches to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`📧 Weekly digest complete: ${sent} sent, ${failed} failed`);
        } catch (error) {
            console.error('Error sending weekly digests:', error);
        }

        return { sent, failed };
    }

    /**
     * Get user's match statistics for the past week
     */
    private async getUserWeeklyStats(userId: string): Promise<{
        totalMatches: number;
        wins: number;
        losses: number;
    }> {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Count matches where user participated (solo tournaments)
        const [winsAsSolo, lossesAsSolo, winsAsTeam, lossesAsTeam] = await Promise.all([
            // Solo wins
            prisma.match.count({
                where: {
                    winnerUserId: userId,
                    playedAt: { gte: weekAgo }
                }
            }),
            // Solo losses
            prisma.match.count({
                where: {
                    OR: [
                        { homeUserId: userId },
                        { awayUserId: userId }
                    ],
                    winnerUserId: { not: userId },
                    NOT: { winnerUserId: null },
                    playedAt: { gte: weekAgo }
                }
            }),
            // Team wins - get user's team IDs first
            this.countTeamWins(userId, weekAgo),
            this.countTeamLosses(userId, weekAgo)
        ]);

        const wins = winsAsSolo + winsAsTeam;
        const losses = lossesAsSolo + lossesAsTeam;

        return {
            totalMatches: wins + losses,
            wins,
            losses
        };
    }

    private async countTeamWins(userId: string, since: Date): Promise<number> {
        // Get teams where user is a member
        const teams = await prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true }
        });

        if (teams.length === 0) return 0;

        const teamIds = teams.map(t => t.teamId);

        return prisma.match.count({
            where: {
                winnerId: { in: teamIds },
                playedAt: { gte: since }
            }
        });
    }

    private async countTeamLosses(userId: string, since: Date): Promise<number> {
        const teams = await prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true }
        });

        if (teams.length === 0) return 0;

        const teamIds = teams.map(t => t.teamId);

        return prisma.match.count({
            where: {
                OR: [
                    { homeTeamId: { in: teamIds } },
                    { awayTeamId: { in: teamIds } }
                ],
                winnerId: { notIn: teamIds, not: null },
                playedAt: { gte: since }
            }
        });
    }

    /**
     * Manually trigger digest for a specific user (for testing)
     */
    async sendDigestToUser(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                displayName: true,
                username: true
            }
        });

        if (!user) return false;

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

        const upcomingTournaments = await prisma.tournament.findMany({
            where: {
                startDate: { gte: now, lte: nextWeek },
                status: { in: ['REGISTRATION', 'IN_PROGRESS'] }
            },
            select: { id: true, name: true, startDate: true },
            orderBy: { startDate: 'asc' },
            take: 5
        });

        const stats = await this.getUserWeeklyStats(user.id);

        return emailService.sendWeeklyDigest(
            user.email,
            user.displayName || user.username,
            upcomingTournaments.map(t => ({
                name: t.name,
                startDate: t.startDate,
                url: `${frontendUrl}/tournaments/${t.id}`
            })),
            stats,
            user.id
        );
    }
}

export const digestService = new DigestService();
