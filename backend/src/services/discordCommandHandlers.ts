/**
 * Discord Command Handlers
 * Contains all slash command handler implementations
 */

import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ColorResolvable
} from 'discord.js';
import prisma from '../lib/prisma.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ========================================
// USER COMMANDS
// ========================================

/**
 * /stats command - Show player statistics
 */
export async function handleStatsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user');
    const discordId = targetUser?.id || interaction.user.id;

    // Find user in database
    const user = await prisma.user.findFirst({
        where: { discordId },
        include: {
            teamMemberships: { include: { team: true } },
            tournamentEntries: { include: { tournament: true } }
        }
    });

    if (!user) {
        await interaction.editReply({
            content: '❌ Ez a felhasználó nincs regisztrálva a rendszerben.\n💡 Használd az `/om` parancsot vagy a weboldalt a fiók összekötéséhez!'
        });
        return;
    }

    // Calculate match statistics
    const [totalWins, totalLosses, tournamentsPlayed] = await Promise.all([
        prisma.match.count({
            where: {
                OR: [
                    { winnerUserId: user.id },
                    { winnerId: { in: user.teamMemberships.map(m => m.teamId) } }
                ],
                status: 'COMPLETED'
            }
        }),
        prisma.match.count({
            where: {
                OR: [
                    { homeUserId: user.id, NOT: { winnerUserId: user.id }, status: 'COMPLETED' },
                    { awayUserId: user.id, NOT: { winnerUserId: user.id }, status: 'COMPLETED' }
                ]
            }
        }),
        prisma.tournamentEntry.count({ where: { userId: user.id } })
    ]);

    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    let avatarUrl = user.avatarUrl || user.steamAvatar;
    const files = [];

    if (avatarUrl && avatarUrl.startsWith('data:image')) {
        const matches = avatarUrl.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
        if (matches) {
            const extension = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            const fileName = `avatar.${extension}`;
            files.push({ attachment: buffer, name: fileName });
            avatarUrl = `attachment://${fileName}`;
        } else {
            avatarUrl = null;
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.displayName || user.username}`)
        .setThumbnail(avatarUrl)
        .addFields(
            { name: '🏆 Elo', value: user.elo.toString(), inline: true },
            { name: '⚔️ Meccsek', value: totalMatches.toString(), inline: true },
            { name: '📈 Győzelem %', value: `${winRate}%`, inline: true },
            { name: '✅ Győzelmek', value: totalWins.toString(), inline: true },
            { name: '❌ Vereségek', value: totalLosses.toString(), inline: true },
            { name: '🎮 Versenyek', value: tournamentsPlayed.toString(), inline: true }
        )
        .setColor(0x8b5cf6 as ColorResolvable)
        .setFooter({ text: `Csatlakozott: ${user.createdAt.toLocaleDateString('hu-HU')}` })
        .setTimestamp();

    if (user.teamMemberships.length > 0) {
        const teams = user.teamMemberships.map(m => m.team.name).join(', ');
        embed.addFields({ name: '👥 Csapatok', value: teams, inline: false });
    }

    await interaction.editReply({ embeds: [embed], files });
}

/**
 * /leaderboard command - Show top 10 players
 */
export async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const gameName = interaction.options.getString('game');

    // Get top 10 users by Elo
    const topUsers = await prisma.user.findMany({
        orderBy: { elo: 'desc' },
        take: 10,
        select: {
            displayName: true,
            username: true,
            elo: true,
            role: true
        }
    });

    if (topUsers.length === 0) {
        await interaction.editReply('❌ Nincsenek még felhasználók a rendszerben.');
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const leaderboardText = topUsers.map((u, i) => {
        const medal = i < 3 ? medals[i] : `**${i + 1}.**`;
        const roleEmoji = u.role === 'ADMIN' ? '👑' : u.role === 'ORGANIZER' ? '🎯' : '';
        return `${medal} ${u.displayName || u.username} ${roleEmoji} - **${u.elo}** Elo`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`🏆 Ranglista${gameName ? ` - ${gameName}` : ''}`)
        .setDescription(leaderboardText)
        .setColor(0xfbbf24 as ColorResolvable)
        .setFooter({ text: 'Top 10 játékos Elo pontszám alapján' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

/**
 * /tournament command - Search and display tournament info
 */
export async function handleTournamentCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const searchName = interaction.options.getString('name');

    // Get tournaments
    const tournaments = await prisma.tournament.findMany({
        where: searchName 
            ? { name: { contains: searchName, mode: 'insensitive' } }
            : { status: { in: ['REGISTRATION', 'IN_PROGRESS'] } },
        include: { 
            game: true, 
            _count: { select: { entries: true } } 
        },
        take: 5,
        orderBy: { startDate: 'asc' }
    });

    if (tournaments.length === 0) {
        await interaction.editReply(searchName 
            ? `❌ Nem találtam versenyt "${searchName}" névvel.`
            : '❌ Nincsenek aktív versenyek jelenleg.'
        );
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle(searchName ? `🔍 Keresés: "${searchName}"` : '🏆 Aktív Versenyek')
        .setColor(0x8b5cf6 as ColorResolvable)
        .setTimestamp();

    for (const t of tournaments) {
        const statusEmoji = t.status === 'REGISTRATION' ? '📝' : t.status === 'IN_PROGRESS' ? '⚔️' : '✅';
        embed.addFields({
            name: `${statusEmoji} ${t.name}`,
            value: [
                `🎮 ${t.game.name}`,
                `📅 ${t.startDate.toLocaleDateString('hu-HU')}`,
                `👥 ${t._count.entries}/${t.maxTeams} résztvevő`,
                `🔗 [Részletek](${FRONTEND_URL}/tournaments/${t.id})`
            ].join(' | '),
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

/**
 * /team command - Display team info
 */
export async function handleTeamCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const teamName = interaction.options.getString('name', true);

    const team = await prisma.team.findFirst({
        where: { name: { contains: teamName, mode: 'insensitive' } },
        include: {
            owner: { select: { displayName: true, username: true } },
            members: { include: { user: { select: { displayName: true, username: true } } } },
            _count: { select: { tournamentEntries: true } }
        }
    });

    if (!team) {
        await interaction.editReply(`❌ Nem találtam csapatot "${teamName}" névvel.`);
        return;
    }

    const memberList = team.members.map(m => 
        `${m.role === 'CAPTAIN' ? '👑' : '👤'} ${m.user.displayName || m.user.username}`
    ).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`👥 ${team.name}`)
        .setDescription(team.description || 'Nincs leírás')
        .setThumbnail(team.logoUrl || null)
        .addFields(
            { name: '🏆 Elo', value: team.elo.toString(), inline: true },
            { name: '🎮 Versenyek', value: team._count.tournamentEntries.toString(), inline: true },
            { name: '📅 Létrehozva', value: team.createdAt.toLocaleDateString('hu-HU'), inline: true },
            { name: `👥 Tagok (${team.members.length})`, value: memberList || 'Nincs tag', inline: false }
        )
        .setColor(0x22c55e as ColorResolvable)
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

// ========================================
// ADMIN COMMANDS
// ========================================

/**
 * /sync-all command - Sync all users (Admin)
 */
export async function handleSyncAllCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    await interaction.editReply('🔄 Szinkronizálás folyamatban...');

    const users = await prisma.user.findMany({
        where: { discordId: { not: null } },
        select: { id: true, discordId: true }
    });

    let synced = 0;
    let failed = 0;

    // Import discordService dynamically
    const { discordService } = await import('./discordService.js');

    for (const user of users) {
        try {
            const result = await discordService.syncUser(user.id);
            if (result.success) synced++;
            else failed++;
        } catch (e) {
            failed++;
        }
    }

    await interaction.editReply(`✅ Szinkronizálás kész!\n\n✓ Sikeres: ${synced}\n✗ Sikertelen: ${failed}`);
}
