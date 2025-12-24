import { 
    Client, 
    GatewayIntentBits, 
    TextChannel, 
    ChannelType, 
    EmbedBuilder, 
    PermissionsBitField, 
    ColorResolvable, 
    CategoryChannel,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Interaction,
    Role,
    CacheType
} from 'discord.js';

interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
    image?: { url: string };
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
                GatewayIntentBits.GuildMembers, // Needed for role management
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
            this.setupInteractionHandler();
        });

        try {
            await this.client.login(DISCORD_BOT_TOKEN);
        } catch (error) {
            console.error('❌ Failed to login to Discord:', error);
        }
    }

    private setupInteractionHandler() {
        this.client.on('interactionCreate', async (interaction: Interaction<CacheType>) => {
            if (!interaction.isButton()) return;

            if (interaction.customId.startsWith('toggle_role_')) {
                const roleName = interaction.customId.replace('toggle_role_', '');
                await this.handleRoleToggle(interaction, roleName);
            }
        });
    }

    private async handleRoleToggle(interaction: any, roleName: string) {
        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return;

            // Find role by name (case insensitive)
            const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());

            if (!role) {
                await interaction.reply({ content: '❌ A kért rang nem található.', ephemeral: true });
                return;
            }

            const member = await guild.members.fetch(interaction.user.id);
            if (!member) return;

            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role);
                await interaction.reply({ content: `✅ Eltávolítva a(z) **${role.name}** értesítés.`, ephemeral: true });
            } else {
                await member.roles.add(role);
                await interaction.reply({ content: `✅ Feliratkozva a(z) **${role.name}** értesítésekre!`, ephemeral: true });
            }
        } catch (error) {
            console.error('Failed to toggle role:', error);
            await interaction.reply({ content: '❌ Hiba történt a rang módosítása közben.', ephemeral: true });
        }
    }

    async ensureCategoryExists(name: string): Promise<string | null> {
        if (!this.isReady) return null;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return null;

            // Fetch all channels
            await guild.channels.fetch();

            // Case-insensitive search for existing category
            const existingCategory = guild.channels.cache.find(c =>
                c?.type === ChannelType.GuildCategory &&
                c.name.toLowerCase() === name.toLowerCase()
            );

            if (existingCategory) {
                return existingCategory.id;
            }

            // Create new category if not found
            const newCategory = await guild.channels.create({
                name: name,
                type: ChannelType.GuildCategory,
            });

            console.log(`✅ Created new Discord category: ${newCategory.name}`);
            return newCategory.id;

        } catch (error) {
            console.error(`Failed to ensure category exists for ${name}:`, error);
            return this.categoryId || null;
        }
    }

    async ensureRoleExists(name: string): Promise<Role | null> {
        if (!this.isReady) return null;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return null;

            await guild.roles.fetch();

            const existingRole = guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
            
            if (existingRole) {
                return existingRole;
            }

            // Create Role
            const newRole = await guild.roles.create({
                name: name,
                color: 'Green', // Default to green or random
                mentionable: true,
                reason: 'Auto-created for Game Notifications',
            });

            console.log(`✅ Created new Discord role: ${newRole.name}`);
            return newRole;
        } catch (error) {
            console.error(`Failed to ensure role exists for ${name}:`, error);
            return null;
        }
    }

    private sanitizeName(name: string): string {
        return name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
            .trim()
            .replace(/\s+/g, "-"); // Replace spaces with dashes
    }

    /**
     * Creates new text and voice channels for a tournament under the game's category
     */
    async createTournamentChannels(tournamentName: string, gameName: string): Promise<{ textChannelId: string | null; voiceChannelId: string | null }> {
        if (!this.isReady) return { textChannelId: null, voiceChannelId: null };

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) {
                console.error(`Guild ${this.guildId} not found`);
                return { textChannelId: null, voiceChannelId: null };
            }

            // 1. Ensure Category & Role Exists
            let targetCategoryId = this.categoryId;
            if (gameName) {
                const gameCategoryId = await this.ensureCategoryExists(gameName);
                if (gameCategoryId) {
                    targetCategoryId = gameCategoryId;
                }
                // Ensure Role exists for this game
                await this.ensureRoleExists(gameName);
            }

            // Sanitize channel name
            const channelName = this.sanitizeName(tournamentName);

            const permissionOverwrites = [
                {
                    id: guild.id, // @everyone
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                    deny: [PermissionsBitField.Flags.SendMessages], // Read-only for everyone by default
                },
                {
                    id: this.client.user!.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Connect],
                },
            ];

            // 2. Create Text Channel
            const textChannel = await guild.channels.create({
                name: `🏆-${channelName}`,
                type: ChannelType.GuildText,
                parent: targetCategoryId || undefined,
                permissionOverwrites,
                topic: `Official channel for ${tournamentName}`,
            });

            // 3. Create Voice Channel
            const voiceChannel = await guild.channels.create({
                name: `🔊 ${tournamentName}`,
                type: ChannelType.GuildVoice,
                parent: targetCategoryId || undefined,
                permissionOverwrites: [
                    ...permissionOverwrites,
                    {
                        id: guild.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak], // Allow speaking in voice
                    }
                ],
            });

            console.log(`✅ Created Discord channels for ${tournamentName}: Text(${textChannel.id}), Voice(${voiceChannel.id})`);

            return {
                textChannelId: textChannel.id,
                voiceChannelId: voiceChannel.id
            };

        } catch (error) {
            console.error('Failed to create tournament channels:', error);
            return { textChannelId: null, voiceChannelId: null };
        }
    }

    /**
     * Sends a message to a specific channel (by ID)
     */
    async sendMessage(channelId: string, embedData: DiscordEmbed, content?: string, components?: any[]): Promise<boolean> {
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

            if (embedData.image) {
                embed.setImage(embedData.image.url);
            }

            await (channel as TextChannel).send({
                content: content,
                embeds: [embed],
                components: components,
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

    async setGuildMemberNickname(discordUserId: string, nickname: string): Promise<boolean> {
        if (!this.isReady) return false;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return false;

            const member = await guild.members.fetch(discordUserId);
            if (!member) {
                console.warn(`Discord Member ${discordUserId} not found in guild`);
                return false;
            }

            // Check if bot can modify the member (bot role must be higher)
            if (!member.manageable) {
                console.warn(`Cannot manage nickname for user ${member.user.tag} (Role hierarchy or owner)`);
                return false;
            }

            await member.setNickname(nickname);
            console.log(`✅ Updated nickname for ${member.user.tag} to "${nickname}"`);
            return true;
        } catch (error) {
            console.error(`Failed to set nickname for ${discordUserId}:`, error);
            return false;
        }
    }

    // --- Specific Notification Methods ---

    async sendTournamentAnnouncement(tournament: { name: string; game: string; startDate: Date; maxTeams: number; id: string; imageUrl?: string | null }, channelId?: string) {
        if (!channelId) return false;

        // Try to find role to mention
        let mentionString = '@everyone';
        if (tournament.game) {
             const guild = this.client.guilds.cache.get(this.guildId);
             const role = guild?.roles.cache.find(r => r.name.toLowerCase() === tournament.game.toLowerCase());
             if (role) {
                 mentionString = role.toString();
             }
        }

        // Create Subscribe Button
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`toggle_role_${tournament.game}`)
                    .setLabel(`🔔 Értesítések: ${tournament.game}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎮')
            );

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
            image: tournament.imageUrl ? { url: tournament.imageUrl } : undefined,
            timestamp: new Date().toISOString(),
        }, mentionString, [row]); 
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
