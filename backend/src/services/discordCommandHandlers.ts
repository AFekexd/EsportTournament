/**
 * Discord Command Handlers
 * Contains all slash command handler implementations
 */

import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonInteraction,
    ModalSubmitInteraction,
    ColorResolvable,
    ChannelType,
    TextChannel
} from 'discord.js';
import prisma from '../lib/prisma.js';
import { discordLogService } from './discordLogService.js';
import { matchReminderService } from './matchReminderService.js';

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
            content: '❌ Ez a felhasználó nincs regisztrálva a rendszerben.\n💡 Használd az `/om` vagy `/link` parancsot a fiók összekötéséhez!'
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

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${user.displayName || user.username}`)
        .setThumbnail(user.avatarUrl || user.steamAvatar || null)
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

    await interaction.editReply({ embeds: [embed] });
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

/**
 * /link command - Link Discord to web account
 */
export async function handleLinkCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    // Check if already linked
    const existingUser = await prisma.user.findFirst({
        where: { discordId: interaction.user.id }
    });

    if (existingUser) {
        await interaction.reply({
            content: `✅ A Discord fiókod már össze van kötve: **${existingUser.displayName || existingUser.username}**`,
            ephemeral: true
        });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('link_modal')
        .setTitle('Fiók Összekötése');

    const usernameInput = new TextInputBuilder()
        .setCustomId('username_input')
        .setLabel('Felhasználónév (weboldalon regisztrált)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('pl. player123')
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(usernameInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

/**
 * Handle link modal submission
 */
export async function handleLinkModal(interaction: ModalSubmitInteraction): Promise<void> {
    const username = interaction.fields.getTextInputValue('username_input');
    await interaction.deferReply({ ephemeral: true });

    const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } }
    });

    if (!user) {
        await interaction.editReply(`❌ Nem találom a "${username}" felhasználót. Ellenőrizd a helyesírást!`);
        return;
    }

    if (user.discordId && user.discordId !== interaction.user.id) {
        await interaction.editReply('❌ Ez a fiók már össze van kötve egy másik Discord fiókkal.');
        return;
    }

    // Check if Discord user is already linked to another Web user
    const existingLink = await prisma.user.findFirst({
        where: {
            discordId: interaction.user.id,
            id: { not: user.id }
        }
    });

    if (existingLink) {
        await interaction.editReply(`❌ A Discord fiókod már össze van kötve egy másik felhasználóval (**${existingLink.displayName || existingLink.username}**)!`);
        return;
    }

    // Link the accounts
    await prisma.user.update({
        where: { id: user.id },
        data: { discordId: interaction.user.id }
    });

    // Web-Discord Sync
    const { webSyncService } = await import('./webSyncService.js');
    await webSyncService.onDiscordLinked(user.id, interaction.user.id);

    await interaction.editReply(`✅ Sikeres összekötés! Üdvözöllek, **${user.displayName || user.username}**!`);
}

/**
 * /predict command - Make a match prediction
 */
export async function handlePredictCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const matchId = interaction.options.getString('match', true);
    const homeScore = interaction.options.getInteger('home_score', true);
    const awayScore = interaction.options.getInteger('away_score', true);

    // Find user
    const user = await prisma.user.findFirst({
        where: { discordId: interaction.user.id }
    });

    if (!user) {
        await interaction.editReply('❌ Először kösd össze a fiókodat az `/link` paranccsal!');
        return;
    }

    // Find match
    const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
            homeTeam: true,
            awayTeam: true,
            homeUser: true,
            awayUser: true,
            tournament: true
        }
    });

    if (!match) {
        await interaction.editReply('❌ Meccs nem található ezzel az ID-vel.');
        return;
    }

    if (match.status !== 'PENDING') {
        await interaction.editReply('❌ Erre a meccsre már nem lehet tippelni.');
        return;
    }

    // Check for existing prediction
    const existing = await prisma.matchPrediction.findUnique({
        where: { matchId_predictorId: { matchId, predictorId: user.id } }
    });

    if (existing) {
        await interaction.editReply('❌ Már tippeltél erre a meccsre!');
        return;
    }

    // Determine predicted winner
    const predictedWinnerId = homeScore > awayScore 
        ? (match.homeTeamId || match.homeUserId)
        : homeScore < awayScore 
            ? (match.awayTeamId || match.awayUserId)
            : null;

    // Create prediction
    await prisma.matchPrediction.create({
        data: {
            matchId,
            predictorId: user.id,
            predictedHomeScore: homeScore,
            predictedAwayScore: awayScore,
            predictedWinnerId
        }
    });

    const homeName = match.homeTeam?.name || match.homeUser?.displayName || 'Hazai';
    const awayName = match.awayTeam?.name || match.awayUser?.displayName || 'Vendég';

    await interaction.editReply(
        `✅ Tipp rögzítve!\n\n**${match.tournament.name}**\n${homeName} **${homeScore}** - **${awayScore}** ${awayName}`
    );
}

/**
 * /checkin command - Check in for upcoming match
 */
export async function handleCheckInCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply({ ephemeral: true });

    const user = await prisma.user.findFirst({
        where: { discordId: interaction.user.id }
    });

    if (!user) {
        await interaction.editReply('❌ Először kösd össze a fiókodat az `/link` paranccsal!');
        return;
    }

    // Find upcoming match for this user
    const now = new Date();
    const soon = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

    const upcomingMatch = await prisma.match.findFirst({
        where: {
            OR: [
                { homeUserId: user.id },
                { awayUserId: user.id }
            ],
            scheduledAt: { gte: now, lte: soon },
            status: 'PENDING'
        },
        include: {
            homeTeam: true,
            awayTeam: true,
            homeUser: true,
            awayUser: true,
            tournament: true
        }
    });

    if (!upcomingMatch) {
        await interaction.editReply('❌ Nincs közelgő mecsed a következő 1 órában.');
        return;
    }

    // Perform check-in
    const result = await matchReminderService.handleCheckIn(upcomingMatch.id, interaction.user.id);
    await interaction.editReply(result.message);
}

/**
 * Handle check-in button click
 */
export async function handleCheckInButton(interaction: ButtonInteraction, matchId: string): Promise<void> {
    await interaction.deferReply({ ephemeral: true });
    const result = await matchReminderService.handleCheckIn(matchId, interaction.user.id);
    await interaction.editReply(result.message);
}

/**
 * /preferences command - Show/edit Discord notification preferences
 */
export async function handlePreferencesCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await prisma.user.findFirst({
        where: { discordId: interaction.user.id }
    });

    if (!user) {
        await interaction.reply({
            content: '❌ Először kösd össze a fiókadat az `/link` paranccsal!',
            ephemeral: true
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🔔 Discord Értesítési Beállítások')
        .setDescription('Kattints a gombokra a beállítások módosításához:')
        .addFields(
            { name: '🏆 Versenyek', value: user.discordDmTournaments ? '✅ BE' : '❌ KI', inline: true },
            { name: '⚔️ Meccsek', value: user.discordDmMatches ? '✅ BE' : '❌ KI', inline: true },
            { name: '🔔 Emlékeztetők', value: user.discordDmReminders ? '✅ BE' : '❌ KI', inline: true },
            { name: '📊 Eredmények', value: user.discordDmResults ? '✅ BE' : '❌ KI', inline: true },
            { name: '⚙️ Rendszer', value: user.discordDmSystem ? '✅ BE' : '❌ KI', inline: true }
        )
        .setColor(0x8b5cf6 as ColorResolvable)
        .setFooter({ text: 'A beállítások azonnal érvénybe lépnek' });

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pref_tournaments')
                .setLabel('Versenyek')
                .setStyle(user.discordDmTournaments ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🏆'),
            new ButtonBuilder()
                .setCustomId('pref_matches')
                .setLabel('Meccsek')
                .setStyle(user.discordDmMatches ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('⚔️'),
            new ButtonBuilder()
                .setCustomId('pref_reminders')
                .setLabel('Emlékeztetők')
                .setStyle(user.discordDmReminders ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🔔'),
            new ButtonBuilder()
                .setCustomId('pref_results')
                .setLabel('Eredmények')
                .setStyle(user.discordDmResults ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('📊'),
            new ButtonBuilder()
                .setCustomId('pref_system')
                .setLabel('Rendszer')
                .setStyle(user.discordDmSystem ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('⚙️')
        );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Handle preference toggle button
 */
export async function handlePreferenceToggle(interaction: ButtonInteraction, prefKey: string): Promise<void> {
    const user = await prisma.user.findFirst({
        where: { discordId: interaction.user.id }
    });

    if (!user) {
        await interaction.reply({ content: '❌ Hiba történt.', ephemeral: true });
        return;
    }

    // Map button key to database field
    const fieldMap: Record<string, keyof typeof user> = {
        'tournaments': 'discordDmTournaments',
        'matches': 'discordDmMatches',
        'reminders': 'discordDmReminders',
        'results': 'discordDmResults',
        'system': 'discordDmSystem'
    };

    const field = fieldMap[prefKey];
    if (!field) {
        await interaction.reply({ content: '❌ Érvénytelen beállítás.', ephemeral: true });
        return;
    }

    const currentValue = user[field] as boolean;
    const newValue = !currentValue;

    // Update in database
    await prisma.user.update({
        where: { id: user.id },
        data: { [field]: newValue }
    });

    await interaction.reply({
        content: `${newValue ? '✅' : '❌'} **${prefKey.charAt(0).toUpperCase() + prefKey.slice(1)}** értesítések: ${newValue ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}`,
        ephemeral: true
    });
}

// ========================================
// ADMIN COMMANDS
// ========================================

/**
 * /announce command - Send system announcement (Admin)
 */
export async function handleAnnounceCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const message = interaction.options.getString('message', true);
    const targetChannel = interaction.options.getChannel('channel');

    await interaction.deferReply({ ephemeral: true });

    const channelId = targetChannel?.id || interaction.channelId;
    const channel = await interaction.client.channels.fetch(channelId);

    if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.editReply('❌ Érvénytelen csatorna.');
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('📢 Rendszerüzenet')
        .setDescription(message)
        .setColor(0x3b82f6 as ColorResolvable)
        .setTimestamp()
        .setFooter({ text: `Küldő: ${interaction.user.username}` });

    await (channel as TextChannel).send({ embeds: [embed] });

    await discordLogService.logSuccess(
        'SYSTEM_ANNOUNCE',
        channelId,
        '',
        'Rendszerüzenet',
        { message, sender: interaction.user.id }
    );

    await interaction.editReply(`✅ Üzenet elküldve a <#${channelId}> csatornába!`);
}

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
