/**
 * Achievement Service
 * Handles achievement tracking and Discord announcements
 */

import prisma from '../lib/prisma.js';
import { discordService } from './discordService.js';
import { discordLogService } from './discordLogService.js';
import { notificationService } from './notificationService.js';

// Achievement definitions
export const ACHIEVEMENTS = {
    // Match achievements
    FIRST_WIN: { id: 'first_win', name: 'Első Győzelem', description: 'Nyerd meg az első meccsedet', emoji: '🏆', points: 10 },
    WIN_STREAK_3: { id: 'win_streak_3', name: 'Győzelmi Sorozat', description: 'Nyerj 3 meccset egymás után', emoji: '🔥', points: 25 },
    WIN_STREAK_5: { id: 'win_streak_5', name: 'Megállíthatatlan', description: 'Nyerj 5 meccset egymás után', emoji: '⚡', points: 50 },
    WIN_STREAK_10: { id: 'win_streak_10', name: 'Legenda', description: 'Nyerj 10 meccset egymás után', emoji: '👑', points: 100 },
    
    // Tournament achievements
    TOURNAMENT_WINNER: { id: 'tournament_winner', name: 'Bajnok', description: 'Nyerj egy versenyt', emoji: '🥇', points: 100 },
    TOURNAMENT_FINALIST: { id: 'tournament_finalist', name: 'Döntős', description: 'Juss döntőbe egy versenyen', emoji: '🥈', points: 50 },
    TOURNAMENT_ROOKIE: { id: 'tournament_rookie', name: 'Újonc', description: 'Vegyél részt az első versenyeden', emoji: '🌟', points: 15 },
    TOURNAMENT_VETERAN: { id: 'tournament_veteran', name: 'Veterán', description: 'Vegyél részt 10 versenyen', emoji: '🎖️', points: 75 },
    
    // Elo achievements
    ELO_1100: { id: 'elo_1100', name: 'Haladó', description: 'Érj el 1100 Elo pontot', emoji: '📈', points: 20 },
    ELO_1200: { id: 'elo_1200', name: 'Szakértő', description: 'Érj el 1200 Elo pontot', emoji: '📊', points: 40 },
    ELO_1300: { id: 'elo_1300', name: 'Mester', description: 'Érj el 1300 Elo pontot', emoji: '🏅', points: 60 },
    ELO_1400: { id: 'elo_1400', name: 'Nagymester', description: 'Érj el 1400 Elo pontot', emoji: '💎', points: 80 },
    ELO_1500: { id: 'elo_1500', name: 'Elit', description: 'Érj el 1500 Elo pontot', emoji: '💠', points: 100 },
    
    // Prediction achievements
    PREDICTION_CORRECT: { id: 'prediction_correct', name: 'Jós', description: 'Találd el az első tipped', emoji: '🔮', points: 10 },
    PREDICTION_STREAK_5: { id: 'prediction_streak_5', name: 'Tisztánlátó', description: 'Találj el 5 tippet egymás után', emoji: '👁️', points: 50 },
    PREDICTION_EXACT: { id: 'prediction_exact', name: 'Pontos Tipp', description: 'Találd el a pontos eredményt', emoji: '🎯', points: 25 },
    
    // Social achievements
    TEAM_CREATOR: { id: 'team_creator', name: 'Csapatalapító', description: 'Hozz létre egy csapatot', emoji: '👥', points: 20 },
    DISCORD_LINKED: { id: 'discord_linked', name: 'Discord Összekötve', description: 'Kösd össze a Discord fiókodat', emoji: '🔗', points: 5 },
    CHECK_IN_EARLY: { id: 'check_in_early', name: 'Korai Ébredés', description: 'Jelentkezz be 30 perccel a meccs előtt', emoji: '⏰', points: 10 },
} as const;

export type AchievementId = keyof typeof ACHIEVEMENTS;

interface UserAchievement {
    id: string;
    unlockedAt: Date;
}

class AchievementService {
    /**
     * Award achievement to user
     */
    async awardAchievement(
        userId: string,
        achievementId: AchievementId,
        metadata?: Record<string, any>
    ): Promise<boolean> {
        try {
            const achievement = ACHIEVEMENTS[achievementId];
            if (!achievement) return false;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                    id: true, 
                    displayName: true, 
                    username: true, 
                    discordId: true,
                    achievements: true
                }
            });

            if (!user) return false;

            // Check if already has this achievement
            const existingAchievements = (user.achievements as UserAchievement[] | null) || [];
            if (existingAchievements.some(a => a.id === achievementId)) {
                return false; // Already has it
            }

            // Add achievement
            const newAchievements = [
                ...existingAchievements,
                { id: achievementId, unlockedAt: new Date().toISOString() }
            ];

            await prisma.user.update({
                where: { id: userId },
                data: { achievements: newAchievements as any }
            });

            console.log(`🏆 Achievement unlocked: ${user.displayName || user.username} - ${achievement.name}`);

            // Send in-app notification
            await notificationService.notifySystem(
                userId,
                `${achievement.emoji} Achievement Feloldva!`,
                `${achievement.name}: ${achievement.description}`,
                '/profile'
            );

            // Send Discord announcement if user has Discord linked
            if (user.discordId) {
                await this.announceToDiscord(user, achievement);
            }

            return true;

        } catch (error) {
            console.error('Error awarding achievement:', error);
            return false;
        }
    }

    /**
     * Announce achievement to Discord
     */
    private async announceToDiscord(
        user: { displayName: string | null; username: string; discordId: string | null },
        achievement: typeof ACHIEVEMENTS[AchievementId]
    ): Promise<void> {
        try {
            // Send DM to user
            if (user.discordId) {
                await discordService.sendDM(user.discordId, {
                    title: `${achievement.emoji} Achievement Feloldva!`,
                    description: `**${achievement.name}**\n${achievement.description}`,
                    color: 0xfbbf24, // Gold
                    fields: [
                        { name: '🎖️ Pont', value: `+${achievement.points}`, inline: true }
                    ]
                });

                await discordLogService.logDM(
                    'ACHIEVEMENT',
                    user.discordId,
                    undefined,
                    achievement.name,
                    true
                );
            }
        } catch (error) {
            console.error('Error announcing achievement to Discord:', error);
        }
    }

    /**
     * Check and award match-related achievements
     */
    async checkMatchAchievements(userId: string): Promise<void> {
        try {
            // Get user's match stats
            const wins = await prisma.match.count({
                where: {
                    OR: [
                        { winnerUserId: userId },
                        { winnerId: { in: await this.getUserTeamIds(userId) } }
                    ],
                    status: 'COMPLETED'
                }
            });

            // First win
            if (wins === 1) {
                await this.awardAchievement(userId, 'FIRST_WIN');
            }

            // Win streaks - check recent matches
            const recentMatches = await prisma.match.findMany({
                where: {
                    OR: [
                        { homeUserId: userId },
                        { awayUserId: userId }
                    ],
                    status: 'COMPLETED'
                },
                orderBy: { playedAt: 'desc' },
                take: 10,
                select: { winnerUserId: true, winnerId: true }
            });

            let currentStreak = 0;
            const userTeamIds = await this.getUserTeamIds(userId);

            for (const match of recentMatches) {
                if (match.winnerUserId === userId || userTeamIds.includes(match.winnerId || '')) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            if (currentStreak >= 3) await this.awardAchievement(userId, 'WIN_STREAK_3');
            if (currentStreak >= 5) await this.awardAchievement(userId, 'WIN_STREAK_5');
            if (currentStreak >= 10) await this.awardAchievement(userId, 'WIN_STREAK_10');

        } catch (error) {
            console.error('Error checking match achievements:', error);
        }
    }

    /**
     * Check and award Elo achievements
     */
    async checkEloAchievements(userId: string, newElo: number): Promise<void> {
        if (newElo >= 1100) await this.awardAchievement(userId, 'ELO_1100');
        if (newElo >= 1200) await this.awardAchievement(userId, 'ELO_1200');
        if (newElo >= 1300) await this.awardAchievement(userId, 'ELO_1300');
        if (newElo >= 1400) await this.awardAchievement(userId, 'ELO_1400');
        if (newElo >= 1500) await this.awardAchievement(userId, 'ELO_1500');
    }

    /**
     * Check tournament achievements
     */
    async checkTournamentAchievements(userId: string, tournamentId: string, placement: number): Promise<void> {
        // Count user's tournament entries
        const entryCount = await prisma.tournamentEntry.count({
            where: { userId }
        });

        if (entryCount === 1) {
            await this.awardAchievement(userId, 'TOURNAMENT_ROOKIE');
        }
        if (entryCount >= 10) {
            await this.awardAchievement(userId, 'TOURNAMENT_VETERAN');
        }

        // Placement achievements
        if (placement === 1) {
            await this.awardAchievement(userId, 'TOURNAMENT_WINNER', { tournamentId });
        }
        if (placement === 2) {
            await this.awardAchievement(userId, 'TOURNAMENT_FINALIST', { tournamentId });
        }
    }

    /**
     * Check prediction achievements
     */
    async checkPredictionAchievements(userId: string): Promise<void> {
        const correctPredictions = await prisma.matchPrediction.count({
            where: { predictorId: userId, isCorrect: true }
        });

        if (correctPredictions >= 1) {
            await this.awardAchievement(userId, 'PREDICTION_CORRECT');
        }

        // Check for exact predictions
        const exactPredictions = await prisma.matchPrediction.count({
            where: { predictorId: userId, points: 10 }
        });

        if (exactPredictions >= 1) {
            await this.awardAchievement(userId, 'PREDICTION_EXACT');
        }
    }

    /**
     * Award Discord linked achievement
     */
    async awardDiscordLinked(userId: string): Promise<void> {
        await this.awardAchievement(userId, 'DISCORD_LINKED');
    }

    /**
     * Award team creator achievement
     */
    async awardTeamCreator(userId: string): Promise<void> {
        await this.awardAchievement(userId, 'TEAM_CREATOR');
    }

    /**
     * Get user's team IDs
     */
    private async getUserTeamIds(userId: string): Promise<string[]> {
        const memberships = await prisma.teamMember.findMany({
            where: { userId },
            select: { teamId: true }
        });
        return memberships.map(m => m.teamId);
    }

    /**
     * Get all achievements for a user
     */
    async getUserAchievements(userId: string): Promise<{
        unlocked: Array<{
            id: string;
            name: string;
            description: string;
            emoji: string;
            points: number;
            unlockedAt: Date;
        }>;
        locked: Array<{
            id: string;
            name: string;
            description: string;
            emoji: string;
            points: number;
        }>;
        totalPoints: number;
    }> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { achievements: true }
        });

        const userAchievements = (user?.achievements as UserAchievement[] | null) || [];
        const unlockedIds = new Set(userAchievements.map(a => a.id));

        const unlocked = userAchievements
            .map(ua => {
                const def = Object.values(ACHIEVEMENTS).find(a => a.id === ua.id);
                if (!def) return null;
                return {
                    id: def.id,
                    name: def.name,
                    description: def.description,
                    emoji: def.emoji,
                    points: def.points,
                    unlockedAt: ua.unlockedAt
                };
            })
            .filter(Boolean) as any[];

        const locked = Object.values(ACHIEVEMENTS)
            .filter(a => !unlockedIds.has(a.id))
            .map(a => ({
                id: a.id,
                name: a.name,
                description: a.description,
                emoji: a.emoji,
                points: a.points
            }));

        const totalPoints = unlocked.reduce((sum, a) => sum + a.points, 0);

        return { unlocked, locked, totalPoints };
    }
}

export const achievementService = new AchievementService();
