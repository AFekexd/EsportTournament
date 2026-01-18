/**
 * Match Reminder Service
 * Handles automatic match reminders and check-in system
 */

import prisma from '../lib/prisma.js';
import { discordLogService } from './discordLogService.js';
import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ColorResolvable
} from 'discord.js';

// Reminder times before match (in minutes)
const REMINDER_TIMES = [60, 15];
const CHECK_IN_DEADLINE_MINUTES = 10;
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

interface MatchWithDetails {
    id: string;
    scheduledAt: Date;
    checkInDeadline: Date | null;
    tournament: {
        id: string;
        name: string;
        discordChannelId: string | null;
    };
    homeTeam?: { id: string; name: string } | null;
    awayTeam?: { id: string; name: string } | null;
    homeUser?: { id: string; displayName: string | null; username: string; discordId: string | null } | null;
    awayUser?: { id: string; displayName: string | null; username: string; discordId: string | null } | null;
}

class MatchReminderService {
    private checkInterval: NodeJS.Timeout | null = null;
    private sentReminders: Set<string> = new Set(); // Track sent reminders: `${matchId}-${minutes}`

    /**
     * Start the reminder scheduler
     */
    startScheduler(): void {
        console.log('🔔 Match Reminder Service started');

        // Initial check
        this.checkUpcomingMatches();

        // Check every minute
        this.checkInterval = setInterval(() => {
            this.checkUpcomingMatches();
        }, CHECK_INTERVAL_MS);
    }

    /**
     * Stop the scheduler
     */
    stopScheduler(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * Check for upcoming matches and send reminders
     */
    private async checkUpcomingMatches(): Promise<void> {
        try {
            const now = new Date();

            // Find matches starting within the next 65 minutes (to catch 60min reminders)
            const upcomingTime = new Date(now.getTime() + 65 * 60 * 1000);

            const upcomingMatches = await prisma.match.findMany({
                where: {
                    scheduledAt: {
                        gte: now,
                        lte: upcomingTime
                    },
                    status: 'PENDING'
                },
                include: {
                    tournament: {
                        select: {
                            id: true,
                            name: true,
                            discordChannelId: true
                        }
                    },
                    homeTeam: { select: { id: true, name: true } },
                    awayTeam: { select: { id: true, name: true } },
                    homeUser: { select: { id: true, displayName: true, username: true, discordId: true } },
                    awayUser: { select: { id: true, displayName: true, username: true, discordId: true } },
                    checkIns: true
                }
            });

            for (const match of upcomingMatches) {
                if (!match.scheduledAt) continue;

                const minutesUntilMatch = Math.floor(
                    (match.scheduledAt.getTime() - now.getTime()) / (60 * 1000)
                );

                // Check each reminder time
                for (const reminderMinutes of REMINDER_TIMES) {
                    const reminderKey = `${match.id}-${reminderMinutes}`;

                    // Send reminder if within range and not already sent
                    if (
                        minutesUntilMatch <= reminderMinutes &&
                        minutesUntilMatch > reminderMinutes - 2 && // 2 minute window
                        !this.sentReminders.has(reminderKey)
                    ) {
                        await this.sendMatchReminder(match as unknown as MatchWithDetails, reminderMinutes);
                        this.sentReminders.add(reminderKey);
                    }
                }

                // Check for check-in deadline
                if (match.checkInDeadline) {
                    const minutesPastDeadline = Math.floor(
                        (now.getTime() - match.checkInDeadline.getTime()) / (60 * 1000)
                    );

                    // If past deadline and match hasn't started
                    if (minutesPastDeadline > 0 && minutesPastDeadline < 5 && match.status === 'PENDING') {
                        await this.handleCheckInDeadline(match as any);
                    }
                }
            }

            // Clean up old reminder tracking (older than 2 hours)
            this.cleanupOldReminders();

        } catch (error) {
            console.error('Error checking upcoming matches:', error);
        }
    }

    /**
     * Send match reminder to participants
     */
    private async sendMatchReminder(match: MatchWithDetails, minutesBefore: number): Promise<void> {
        const homeName = match.homeTeam?.name || match.homeUser?.displayName || match.homeUser?.username || 'TBD';
        const awayName = match.awayTeam?.name || match.awayUser?.displayName || match.awayUser?.username || 'TBD';

        console.log(`🔔 Sending ${minutesBefore}min reminder for match: ${homeName} vs ${awayName}`);

        try {
            // Import discordService dynamically to avoid circular dependency
            const { discordService } = await import('./discordService.js');

            // Create reminder embed
            const embed = this.createReminderEmbed(match, homeName, awayName, minutesBefore);
            const row = this.createCheckInButtons(match.id);

            // Send to tournament channel if available
            if (match.tournament.discordChannelId) {
                const success = await discordService.sendMessage(
                    match.tournament.discordChannelId,
                    {
                        title: embed.title,
                        description: embed.description,
                        color: embed.color,
                        fields: embed.fields,
                        timestamp: new Date().toISOString()
                    },
                    undefined,
                    [row]
                );

                if (success) {
                    await discordLogService.logSuccess(
                        'MATCH_REMINDER',
                        match.tournament.discordChannelId,
                        '',
                        `Match Reminder: ${homeName} vs ${awayName}`,
                        { matchId: match.id, minutesBefore }
                    );
                }
            }

            // Send DM reminders to solo players
            if (match.homeUser?.discordId) {
                await this.sendPlayerReminder(match.homeUser, match, homeName, awayName, minutesBefore);
            }
            if (match.awayUser?.discordId) {
                await this.sendPlayerReminder(match.awayUser, match, homeName, awayName, minutesBefore);
            }

            // TODO: For team matches, send to all team members

        } catch (error) {
            console.error('Error sending match reminder:', error);
            await discordLogService.logError(
                'MATCH_REMINDER',
                (error as Error).message,
                match.tournament.discordChannelId || undefined,
                { matchId: match.id }
            );
        }
    }

    /**
     * Send DM reminder to a player
     */
    private async sendPlayerReminder(
        player: { id: string; discordId: string | null; displayName: string | null; username: string },
        match: MatchWithDetails,
        homeName: string,
        awayName: string,
        minutesBefore: number
    ): Promise<void> {
        if (!player.discordId) return;

        // Check user preferences
        const user = await prisma.user.findUnique({
            where: { id: player.id },
            select: { discordDmMatches: true, discordDmReminders: true }
        });

        if (!user?.discordDmMatches || !user?.discordDmReminders) return;

        try {
            const { discordService } = await import('./discordService.js');
            
            await discordService.sendDM(player.discordId, {
                title: `⚔️ Meccs ${minutesBefore} perc múlva!`,
                description: `**${match.tournament.name}**\n\n${homeName} vs ${awayName}`,
                color: 0xf59e0b,
                fields: [
                    { name: '⏰ Kezdés', value: match.scheduledAt!.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }), inline: true }
                ]
            });

            await discordLogService.logDM('MATCH_REMINDER', player.discordId, player.id, 'Match Reminder DM', true);

        } catch (error) {
            console.error(`Failed to send DM to ${player.username}:`, error);
            await discordLogService.logDM('MATCH_REMINDER', player.discordId, player.id, 'Match Reminder DM', false, (error as Error).message);
        }
    }

    /**
     * Create reminder embed data
     */
    private createReminderEmbed(
        match: MatchWithDetails,
        homeName: string,
        awayName: string,
        minutesBefore: number
    ): { title: string; description: string; color: number; fields: Array<{ name: string; value: string; inline?: boolean }> } {
        const isUrgent = minutesBefore <= 15;

        return {
            title: isUrgent ? '⚠️ Meccs hamarosan kezdődik!' : '🔔 Meccs emlékeztető',
            description: `**${match.tournament.name}**`,
            color: isUrgent ? 0xef4444 : 0xf59e0b, // Red for urgent, orange otherwise
            fields: [
                { name: '⚔️ Meccs', value: `${homeName} vs ${awayName}`, inline: false },
                { name: '⏰ Kezdés', value: `${minutesBefore} perc múlva`, inline: true },
                { name: '📅 Időpont', value: match.scheduledAt!.toLocaleString('hu-HU'), inline: true },
                { name: '✅ Check-in', value: 'Kattints a gombra a bejelentkezéshez!', inline: false }
            ]
        };
    }

    /**
     * Create check-in button row
     */
    private createCheckInButtons(matchId: string): ActionRowBuilder<ButtonBuilder> {
        return new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`checkin_${matchId}`)
                    .setLabel('✅ Check-in')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`match_info_${matchId}`)
                    .setLabel('ℹ️ Részletek')
                    .setStyle(ButtonStyle.Secondary)
            );
    }

    /**
     * Handle check-in for a match
     */
    async handleCheckIn(matchId: string, discordId: string): Promise<{ success: boolean; message: string }> {
        try {
            // Find user by Discord ID
            const user = await prisma.user.findFirst({
                where: { discordId }
            });

            if (!user) {
                return { success: false, message: 'Először kösd össze a Discord fiókodat a webes fiókkal!' };
            }

            // Find match and check if user is participant
            const match = await prisma.match.findUnique({
                where: { id: matchId },
                include: {
                    homeUser: true,
                    awayUser: true,
                    homeTeam: { include: { members: true } },
                    awayTeam: { include: { members: true } },
                    checkIns: true
                }
            });

            if (!match) {
                return { success: false, message: 'Meccs nem található.' };
            }

            // Check if user is participant
            const isHomePlayer = match.homeUserId === user.id;
            const isAwayPlayer = match.awayUserId === user.id;
            const isHomeTeamMember = match.homeTeam?.members.some(m => m.userId === user.id);
            const isAwayTeamMember = match.awayTeam?.members.some(m => m.userId === user.id);

            if (!isHomePlayer && !isAwayPlayer && !isHomeTeamMember && !isAwayTeamMember) {
                return { success: false, message: 'Nem vagy résztvevője ennek a meccsnek.' };
            }

            // Check if already checked in
            const existingCheckIn = match.checkIns.find(c => c.userId === user.id);
            if (existingCheckIn) {
                return { success: false, message: 'Már bejelentkeztél erre a meccsre!' };
            }

            // Create check-in
            await prisma.matchCheckIn.create({
                data: {
                    matchId,
                    userId: user.id,
                    teamId: isHomeTeamMember ? match.homeTeamId : isAwayTeamMember ? match.awayTeamId : null
                }
            });

            await discordLogService.log({
                type: 'CHECK_IN_REQUEST',
                discordId,
                userId: user.id,
                content: `Check-in for match ${matchId}`,
                status: 'SENT',
                metadata: { matchId }
            });

            return { success: true, message: `✅ Sikeres bejelentkezés, ${user.displayName || user.username}!` };

        } catch (error) {
            console.error('Check-in error:', error);
            return { success: false, message: 'Hiba történt a bejelentkezés során.' };
        }
    }

    /**
     * Handle check-in deadline - DQ players who didn't check in
     */
    private async handleCheckInDeadline(match: any): Promise<void> {
        const checkIns = match.checkIns || [];
        const checkedInUserIds = checkIns.map((c: any) => c.userId);

        // Check who didn't check in
        const homeDidntCheckIn = match.homeUserId && !checkedInUserIds.includes(match.homeUserId);
        const awayDidntCheckIn = match.awayUserId && !checkedInUserIds.includes(match.awayUserId);

        // If both didn't check in, cancel the match
        if (homeDidntCheckIn && awayDidntCheckIn) {
            await prisma.match.update({
                where: { id: match.id },
                data: { status: 'CANCELLED' }
            });
            console.log(`Match ${match.id} cancelled - both players no-show`);
            return;
        }

        // If one didn't check in, award win to the other
        if (homeDidntCheckIn && !awayDidntCheckIn) {
            await prisma.match.update({
                where: { id: match.id },
                data: {
                    status: 'COMPLETED',
                    winnerUserId: match.awayUserId,
                    winnerId: match.awayTeamId,
                    homeScore: 0,
                    awayScore: 1, // Walkover
                    playedAt: new Date()
                }
            });
            console.log(`Match ${match.id} awarded to away player - home no-show`);
        } else if (awayDidntCheckIn && !homeDidntCheckIn) {
            await prisma.match.update({
                where: { id: match.id },
                data: {
                    status: 'COMPLETED',
                    winnerUserId: match.homeUserId,
                    winnerId: match.homeTeamId,
                    homeScore: 1,
                    awayScore: 0, // Walkover
                    playedAt: new Date()
                }
            });
            console.log(`Match ${match.id} awarded to home player - away no-show`);
        }
    }

    /**
     * Get check-in status for a match
     */
    async getCheckInStatus(matchId: string): Promise<{
        homeCheckedIn: boolean;
        awayCheckedIn: boolean;
        checkIns: Array<{ userId: string; username: string; checkedAt: Date }>;
    }> {
        const match = await prisma.match.findUnique({
            where: { id: matchId },
            include: {
                checkIns: {
                    include: {
                        user: { select: { username: true, displayName: true } }
                    }
                },
                homeUser: { select: { id: true } },
                awayUser: { select: { id: true } },
                homeTeam: { include: { members: { select: { userId: true } } } },
                awayTeam: { include: { members: { select: { userId: true } } } }
            }
        });

        if (!match) {
            return { homeCheckedIn: false, awayCheckedIn: false, checkIns: [] };
        }

        const checkedInUserIds = match.checkIns.map(c => c.userId);

        // For solo matches
        let homeCheckedIn = false;
        let awayCheckedIn = false;

        if (match.homeUserId) {
            homeCheckedIn = checkedInUserIds.includes(match.homeUserId);
        }
        if (match.awayUserId) {
            awayCheckedIn = checkedInUserIds.includes(match.awayUserId);
        }

        // For team matches - check if at least one member checked in
        if (match.homeTeam) {
            homeCheckedIn = match.homeTeam.members.some(m => checkedInUserIds.includes(m.userId));
        }
        if (match.awayTeam) {
            awayCheckedIn = match.awayTeam.members.some(m => checkedInUserIds.includes(m.userId));
        }

        return {
            homeCheckedIn,
            awayCheckedIn,
            checkIns: match.checkIns.map(c => ({
                userId: c.userId,
                username: c.user.displayName || c.user.username,
                checkedAt: c.checkedAt
            }))
        };
    }

    /**
     * Clean up old reminder tracking entries
     */
    private cleanupOldReminders(): void {
        // This is a simple in-memory cleanup
        // In production, you might want to persist and clean from DB
        if (this.sentReminders.size > 1000) {
            this.sentReminders.clear();
        }
    }
}

export const matchReminderService = new MatchReminderService();
