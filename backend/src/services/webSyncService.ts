/**
 * Web-Discord Sync Service
 * Synchronizes user roles, team memberships, and tournament participation with Discord
 */

import prisma from '../lib/prisma.js';
import { discordService } from './discordService.js';
import { discordLogService } from './discordLogService.js';
import { achievementService } from './achievementService.js';

class WebSyncService {
    /**
     * Sync user on profile update
     */
    async onUserUpdate(userId: string): Promise<void> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { discordId: true, displayName: true, username: true, role: true }
            });

            if (!user?.discordId) return;

            // Sync nickname and roles
            await discordService.syncUser(userId);
            
            console.log(`[WebSync] User synced: ${user.displayName || user.username}`);
        } catch (error) {
            console.error('[WebSync] Error syncing user:', error);
        }
    }

    /**
     * Called when Discord account is linked
     */
    async onDiscordLinked(userId: string, discordId: string): Promise<void> {
        try {
            // Award achievement
            await achievementService.awardDiscordLinked(userId);

            // Sync user to Discord
            await discordService.syncUser(userId);

            console.log(`[WebSync] Discord linked for user ${userId}`);
        } catch (error) {
            console.error('[WebSync] Error on Discord link:', error);
        }
    }

    /**
     * Called when user joins a team
     */
    async onTeamJoin(userId: string, teamId: string): Promise<void> {
        try {
            const [user, team] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { discordId: true, displayName: true, username: true }
                }),
                prisma.team.findUnique({
                    where: { id: teamId },
                    select: { name: true }
                })
            ]);

            if (!user?.discordId || !team) return;

            // Sync user roles (team members might get special role)
            await discordService.syncUser(userId);

            // Send DM notification
            await discordService.sendDM(user.discordId, {
                title: '👥 Csapathoz Csatlakoztál',
                description: `Sikeresen csatlakoztál a **${team.name}** csapathoz!`,
                color: 0x22c55e,
                fields: [
                    { name: '🔗 Link', value: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/teams`, inline: false }
                ]
            });

            console.log(`[WebSync] User ${user.displayName || user.username} joined team ${team.name}`);
        } catch (error) {
            console.error('[WebSync] Error on team join:', error);
        }
    }

    /**
     * Called when user leaves a team
     */
    async onTeamLeave(userId: string, teamId: string): Promise<void> {
        try {
            const [user, team] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { discordId: true }
                }),
                prisma.team.findUnique({
                    where: { id: teamId },
                    select: { name: true }
                })
            ]);

            if (!user?.discordId || !team) return;

            // Sync roles (remove team role if any)
            await discordService.syncUser(userId);

            console.log(`[WebSync] User left team ${team.name}`);
        } catch (error) {
            console.error('[WebSync] Error on team leave:', error);
        }
    }

    /**
     * Called when team is created
     */
    async onTeamCreated(userId: string, teamId: string): Promise<void> {
        try {
            // Award achievement
            await achievementService.awardTeamCreator(userId);

            const team = await prisma.team.findUnique({
                where: { id: teamId },
                include: { owner: { select: { discordId: true } } }
            });

            if (!team?.owner?.discordId) return;

            // Send DM
            await discordService.sendDM(team.owner.discordId, {
                title: '👥 Csapat Létrehozva',
                description: `Sikeresen létrehoztad a **${team.name}** csapatot!`,
                color: 0x8b5cf6,
                fields: [
                    { name: '🔑 Csatlakozási kód', value: `\`${team.joinCode}\``, inline: true }
                ]
            });

            console.log(`[WebSync] Team created: ${team.name}`);
        } catch (error) {
            console.error('[WebSync] Error on team created:', error);
        }
    }

    /**
     * Called when user registers for tournament
     */
    async onTournamentRegister(userId: string, tournamentId: string, teamId?: string): Promise<void> {
        try {
            const [user, tournament] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { discordId: true, displayName: true, username: true }
                }),
                prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: { name: true, discordChannelId: true, discordRoleId: true }
                })
            ]);

            if (!user?.discordId || !tournament) return;

            // Assign role
            if (tournament.discordRoleId) {
                await discordService.addRoleToUser(user.discordId, tournament.discordRoleId);
            }

            // Send welcome DM
            await discordService.sendDM(user.discordId, {
                title: '🎮 Regisztráció Sikeres',
                description: `Sikeresen regisztráltál a **${tournament.name}** versenyre!`,
                color: 0x22c55e,
                fields: [
                    { name: '📅 Részletek', value: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}`, inline: false }
                ]
            });

            // Announce in tournament channel
            if (tournament.discordChannelId) {
                await discordService.sendMessage(tournament.discordChannelId, {
                    title: '📝 Új Jelentkező',
                    description: `**${user.displayName || user.username}** regisztrált a versenyre!`,
                    color: 0x22c55e,
                    timestamp: new Date().toISOString()
                });
            }

            await discordLogService.log({
                type: 'TOURNAMENT_ANNOUNCE',
                userId,
                discordId: user.discordId,
                embedTitle: 'Tournament Registration',
                status: 'SENT',
                metadata: { tournamentId }
            });

            console.log(`[WebSync] User registered for tournament: ${tournament.name}`);
        } catch (error) {
            console.error('[WebSync] Error on tournament register:', error);
        }
    }

    /**
     * Called when user withdraws from tournament
     */
    async onTournamentWithdraw(userId: string, tournamentId: string): Promise<void> {
        try {
            const [user, tournament] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: userId },
                    select: { discordId: true }
                }),
                prisma.tournament.findUnique({
                    where: { id: tournamentId },
                    select: { discordRoleId: true }
                })
            ]);

            if (!user?.discordId || !tournament) return;

            // Remove tournament role
            if (tournament.discordRoleId) {
                await discordService.removeRoleFromUser(user.discordId, tournament.discordRoleId);
            }

            console.log(`[WebSync] User withdrew from tournament`);
        } catch (error) {
            console.error('[WebSync] Error on tournament withdraw:', error);
        }
    }

    /**
     * Called when match result is recorded
     */
    async onMatchResult(matchId: string): Promise<void> {
        try {
            const match = await prisma.match.findUnique({
                where: { id: matchId },
                include: {
                    homeUser: { select: { id: true, discordId: true, elo: true } },
                    awayUser: { select: { id: true, discordId: true, elo: true } },
                    homeTeam: { include: { members: { include: { user: { select: { id: true, discordId: true, elo: true } } } } } },
                    awayTeam: { include: { members: { include: { user: { select: { id: true, discordId: true, elo: true } } } } } },
                    tournament: { select: { name: true, discordChannelId: true } }
                }
            });

            if (!match) return;

            // Collect all participants
            const participants: Array<{ id: string; discordId: string | null; elo: number }> = [];

            if (match.homeUser) participants.push(match.homeUser);
            if (match.awayUser) participants.push(match.awayUser);
            if (match.homeTeam) participants.push(...match.homeTeam.members.map(m => m.user));
            if (match.awayTeam) participants.push(...match.awayTeam.members.map(m => m.user));

            // Check achievements for each participant
            for (const p of participants) {
                // Check match achievements
                await achievementService.checkMatchAchievements(p.id);
                
                // Check Elo achievements
                await achievementService.checkEloAchievements(p.id, p.elo);
            }

            // Send result DM to participants
            const winnerName = match.homeScore! > match.awayScore!
                ? (match.homeTeam?.name || match.homeUser?.id)
                : (match.awayTeam?.name || match.awayUser?.id);

            for (const p of participants) {
                if (!p.discordId) continue;

                const won = match.winnerUserId === p.id;
                await discordService.sendDM(p.discordId, {
                    title: won ? '🏆 Meccs Nyerve!' : '📊 Meccs Véget Ért',
                    description: `**${match.tournament.name}**`,
                    color: won ? 0x22c55e : 0x6b7280,
                    fields: [
                        { name: 'Eredmény', value: `${match.homeScore} - ${match.awayScore}`, inline: true }
                    ]
                });
            }

            // Calculate prediction points
            const predictions = await prisma.matchPrediction.findMany({
                where: { matchId }
            });

            for (const pred of predictions) {
                await achievementService.checkPredictionAchievements(pred.predictorId);
            }

            console.log(`[WebSync] Match result processed: ${matchId}`);
        } catch (error) {
            console.error('[WebSync] Error on match result:', error);
        }
    }

    /**
     * Called when Elo is updated
     */
    async onEloUpdate(userId: string, newElo: number): Promise<void> {
        await achievementService.checkEloAchievements(userId, newElo);
    }
}

export const webSyncService = new WebSyncService();
