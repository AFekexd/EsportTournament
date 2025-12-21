import { Client, GatewayIntentBits, TextChannel, ChannelType, EmbedBuilder, PermissionsBitField, ColorResolvable } from 'discord.js';

interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
}

class DiscordService {
    private client: Client;
    private isReady: boolean = false;
    private guildId: string = '';
    private categoryId: string = '';

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ],
        });

        this.initialize();
    }

    private async initialize() {
        const { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_CATEGORY_ID } = process.env;

        if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
            console.warn('⚠️ Discord Bot Token or Guild ID not configured. Discord service disabled.');
            return;
        }

        this.guildId = DISCORD_GUILD_ID;
        this.categoryId = DISCORD_CATEGORY_ID || '';

        this.client.once('ready', () => {
            console.log(`✅ Discord Bot logged in as ${this.client.user?.tag}`);
            this.isReady = true;
        });

        try {
            await this.client.login(DISCORD_BOT_TOKEN);
        } catch (error) {
            console.error('❌ Failed to login to Discord:', error);
        }
    }

    /**
     * Creates a new text channel for a tournament under the configured category
     */
    async createTournamentChannel(tournamentName: string): Promise<string | null> {
        if (!this.isReady) return null;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) {
                console.error(`Guild ${this.guildId} not found`);
                return null;
            }

            // Sanitize channel name (lowercase, replace spaces with dashes, remove special chars)
            const channelName = tournamentName
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .trim()
                .replace(/\s+/g, '-');

            const channel = await guild.channels.create({
                name: `🏆-${channelName}`,
                type: ChannelType.GuildText,
                parent: this.categoryId || undefined,
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                        deny: [PermissionsBitField.Flags.SendMessages], // Read-only for everyone by default
                    },
                    {
                        id: this.client.user!.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
                    },
                ],
                topic: `Official channel for ${tournamentName}`,
            });

            console.log(`✅ Created Discord channel: ${channel.name} (${channel.id})`);
            return channel.id;

        } catch (error) {
            console.error('Failed to create tournament channel:', error);
            return null;
        }
    }

    /**
     * Sends a message to a specific channel (by ID)
     */
    async sendMessage(channelId: string, embedData: DiscordEmbed, content?: string): Promise<boolean> {
        if (!this.isReady) return false;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) {
                console.warn(`Channel ${channelId} not found or not text-based`);
                return false;
            }

            const embed = new EmbedBuilder()
                .setTitle(embedData.title)
                .setDescription(embedData.description || null)
                .setColor(embedData.color as ColorResolvable)
                .setTimestamp(embedData.timestamp ? new Date(embedData.timestamp) : new Date());

            if (embedData.fields) {
                embed.addFields(embedData.fields);
            }

            await (channel as TextChannel).send({
                content: content,
                embeds: [embed],
            });

            return true;
        } catch (error) {
            console.error(`Failed to send message to channel ${channelId}:`, error);
            return false;
        }
    }

    async getAvailableChannels(): Promise<Array<{ id: string; name: string }>> {
        if (!this.isReady) return [];

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return [];

            const channels = await guild.channels.fetch();
            //console.log(channels);
            return channels
                .filter(c => c?.type === ChannelType.GuildText)
                .map(c => ({
                    id: c!.id,
                    name: c!.name,
                }));
        } catch (error) {
            console.error('Failed to fetch available channels:', error);
            return [];
        }
    }

    async searchGuildMembers(query: string): Promise<Array<{ id: string; username: string; displayName: string; avatarUrl: string | null }>> {
        if (!this.isReady) return [];

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return [];

            const members = await guild.members.search({ query, limit: 10 });
            return members.map(m => ({
                id: m.id,
                username: m.user.username,
                displayName: m.displayName,
                avatarUrl: m.user.displayAvatarURL(),
            }));
        } catch (error) {
            console.error('Failed to search guild members:', error);
            return [];
        }
    }

    // --- Specific Notification Methods ---

    async sendTournamentAnnouncement(tournament: { name: string; game: string; startDate: Date; maxTeams: number; id: string }, channelId?: string) {
        if (!channelId) {
            // Check if there is a general/announcements channel configured, otherwise we might skip
            // For now, we only send if we have a target channel.
            // If the user hasn't configured a channel ID, we can try to find a default one or just return.
            // But usually this method is called when we have a target.
            return false;
        }

        return this.sendMessage(channelId, {
            title: '🏆 Új Verseny!',
            description: `**${tournament.name}** verseny meghirdetésre került!`,
            color: 0x8b5cf6, // Purple
            fields: [
                { name: 'Játék', value: tournament.game, inline: true },
                { name: 'Kezdés', value: tournament.startDate.toLocaleDateString('hu-HU'), inline: true },
                { name: 'Max csapatok', value: tournament.maxTeams.toString(), inline: true },
                { name: 'Link', value: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournament.id}`, inline: false },
            ],
            timestamp: new Date().toISOString(),
        }, '@everyone'); // Mention everyone for new tournaments
    }

    async sendMatchResult(match: { tournament: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; winner: string }, channelId: string) {
        const isHomeWinner = match.winner === match.homeTeam;
        return this.sendMessage(channelId, {
            title: '⚔️ Meccs Eredmény',
            description: `**${match.tournament}**`,
            color: 0x22c55e, // Green
            fields: [
                { name: isHomeWinner ? '🏆 ' + match.homeTeam : match.homeTeam, value: match.homeScore.toString(), inline: true },
                { name: 'vs', value: '-', inline: true },
                { name: !isHomeWinner ? '🏆 ' + match.awayTeam : match.awayTeam, value: match.awayScore.toString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
        });
    }

    async sendSystemAnnouncement(title: string, message: string, channelId?: string) {
        let targetChannelId = channelId;

        // If no channel ID provided, try to find a default one
        if (!targetChannelId && this.isReady) {
            try {
                const guild = await this.client.guilds.fetch(this.guildId);
                if (guild) {
                    const channels = await guild.channels.fetch();
                    const defaultChannel = channels.find(c =>
                        c?.type === ChannelType.GuildText &&
                        (c.name === 'announcements' || c.name === 'general' || c.name === 'hirdetmények')
                    );
                    if (defaultChannel) {
                        targetChannelId = defaultChannel.id;
                    }
                }
            } catch (error) {
                console.error('Failed to find default channel:', error);
            }
        }

        if (!targetChannelId) return false;

        return this.sendMessage(targetChannelId, {
            title: `📢 ${title}`,
            description: message,
            color: 0x3b82f6, // Blue
            timestamp: new Date().toISOString(),
        });
    }
}

export const discordService = new DiscordService();
