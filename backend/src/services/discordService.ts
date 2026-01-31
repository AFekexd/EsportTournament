import "dotenv/config";
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
    CacheType,
    Message,
    REST,
    Routes,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonInteraction,
    ModalSubmitInteraction
} from 'discord.js';
import prisma from '../lib/prisma.js';
import { DISCORD_ROLE_MAP, BASE_VERIFIED_ROLES, GUEST_ROLES } from '../config/discordRoles.js';
import { Role as UserRole } from '../generated/prisma/enums.js';
import * as CommandHandlers from './discordCommandHandlers.js';


interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
    image?: { url: string };
}




const registrationMessage = `Ebben a csatornában csak a /om parancsot használd! 
Ha még nem regisztráltál, akkor kérlek menj fel a https://esport.pollak.info/ oldalra, és regisztrálj magad! 
Ha már regisztráltál, akkor kérlek írd be a parancsot a hitelesítéshez.`;

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
                GatewayIntentBits.MessageContent, // Needed for reading message content
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

        this.client.once('ready', async () => {
            console.log(`✅ Discord Bot logged in as ${this.client.user?.tag}`);
            this.isReady = true;
            this.setupInteractionHandler();
            this.setupGuildMemberAdd();
            this.setupMessageMonitor();

            // Register Slash Command
            await this.registerCommands(DISCORD_BOT_TOKEN, DISCORD_GUILD_ID);
        });

        try {
            await this.client.login(DISCORD_BOT_TOKEN);
        } catch (error) {
            console.error('❌ Failed to login to Discord:', error);
        }
    }

    private async registerCommands(token: string, guildId: string) {
        const commands = [
            // Existing commands
            new SlashCommandBuilder()
                .setName('om')
                .setDescription('Tanulói azonosítás OM azonosítóval')
                .addStringOption(option =>
                    option.setName('azonosito')
                        .setDescription('A 11 jegyű oktatási azonosítód')
                        .setRequired(true)),
            new SlashCommandBuilder()
                .setName('deploy-verify')
                .setDescription('Hitelesítő üzenet küldése (Admin)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            // New user commands
            new SlashCommandBuilder()
                .setName('stats')
                .setDescription('Játékos statisztikák megtekintése')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Melyik játékos? (hagyd üresen saját)')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('leaderboard')
                .setDescription('Top 10 ranglista')
                .addStringOption(option =>
                    option.setName('game')
                        .setDescription('Játék szűrő (opcionális)')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('tournament')
                .setDescription('Verseny információk keresése')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Verseny neve (részleges keresés)')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('team')
                .setDescription('Csapat információk')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Csapat neve')
                        .setRequired(true)),

            new SlashCommandBuilder()
                .setName('link')
                .setDescription('Discord fiók összekötése a webes fiókkal'),

            new SlashCommandBuilder()
                .setName('predict')
                .setDescription('Tippelj egy meccs eredményére')
                .addStringOption(option =>
                    option.setName('match')
                        .setDescription('Meccs ID')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('home_score')
                        .setDescription('Hazai pontszám')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(100))
                .addIntegerOption(option =>
                    option.setName('away_score')
                        .setDescription('Vendég pontszám')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(100)),

            new SlashCommandBuilder()
                .setName('checkin')
                .setDescription('Bejelentkezés a következő meccsedre'),

            new SlashCommandBuilder()
                .setName('preferences')
                .setDescription('Discord értesítés beállítások megtekintése/módosítása'),

            // Admin commands
            new SlashCommandBuilder()
                .setName('announce')
                .setDescription('Rendszerüzenet küldése (Admin)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
                .addStringOption(option =>
                    option.setName('message')
                        .setDescription('Üzenet tartalma')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Célcsatorna (opcionális)')
                        .setRequired(false)),

            new SlashCommandBuilder()
                .setName('sync-all')
                .setDescription('Összes felhasználó szinkronizálása (Admin)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

            new SlashCommandBuilder()
                .setName('recheck')
                .setDescription('Vendég rangok kiosztása nem hitelesített tagoknak (Admin)')
                .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        ];

        try {
            const guild = await this.client.guilds.fetch(guildId);
            if (guild) {
                await guild.commands.set(commands);
                console.log(`✅ Successfully registered ${commands.length} slash commands.`);
            }
        } catch (error) {
            console.error('❌ Failed to register slash commands:', error);
        }
    }

    private setupInteractionHandler() {
        this.client.on('interactionCreate', async (interaction: Interaction<CacheType>) => {
            if (interaction.isButton()) {
                if (interaction.customId.startsWith('toggle_role_')) {
                    const roleName = interaction.customId.replace('toggle_role_', '');
                    await this.handleRoleToggle(interaction, roleName);
                } else if (interaction.customId === 'verify_button') {
                    await this.handleVerifyButton(interaction);
                } else if (interaction.customId.startsWith('checkin_')) {
                    const matchId = interaction.customId.replace('checkin_', '');
                    await CommandHandlers.handleCheckInButton(interaction, matchId);
                } else if (interaction.customId.startsWith('pref_')) {
                    const prefKey = interaction.customId.replace('pref_', '');
                    await CommandHandlers.handlePreferenceToggle(interaction, prefKey);
                }
                return;
            }

            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'verify_modal') {
                    await this.handleVerifyModal(interaction);
                } else if (interaction.customId === 'link_modal') {
                    await CommandHandlers.handleLinkModal(interaction);
                }
                return;
            }

            if (interaction.isChatInputCommand()) {
                // Log command usage
                const { discordLogService } = await import('./discordLogService.js');
                await discordLogService.logCommand(interaction.commandName, interaction.user.id);

                switch (interaction.commandName) {
                    case 'om':
                        await this.handleOmCommand(interaction);
                        break;
                    case 'recheck':
                        await this.handleRecheckCommand(interaction);
                        break;
                    case 'deploy-verify':
                        await this.handleDeployVerify(interaction);
                        break;
                    case 'stats':
                        await CommandHandlers.handleStatsCommand(interaction);
                        break;
                    case 'leaderboard':
                        await CommandHandlers.handleLeaderboardCommand(interaction);
                        break;
                    case 'tournament':
                        await CommandHandlers.handleTournamentCommand(interaction);
                        break;
                    case 'team':
                        await CommandHandlers.handleTeamCommand(interaction);
                        break;
                    case 'link':
                        await CommandHandlers.handleLinkCommand(interaction);
                        break;
                    case 'predict':
                        await CommandHandlers.handlePredictCommand(interaction);
                        break;
                    case 'checkin':
                        await CommandHandlers.handleCheckInCommand(interaction);
                        break;
                    case 'preferences':
                        await CommandHandlers.handlePreferencesCommand(interaction);
                        break;
                    case 'announce':
                        await CommandHandlers.handleAnnounceCommand(interaction);
                        break;
                    case 'sync-all':
                        await CommandHandlers.handleSyncAllCommand(interaction);
                        break;
                }
            }
        });
    }

    private setupGuildMemberAdd() {
        this.client.on('guildMemberAdd', async (member) => {
            const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'general' || c.name === 'csevegő' || c.name === 'hirdetmények') as TextChannel;
            if (welcomeChannel) {
                await welcomeChannel.send(`Üdvözöllek ${member.toString()}! Kérlek igazold magad az OM azonosítóddal a következő paranccsal: \`/om <OM_AZONOSÍTÓ>\`, vagy használd a hitelesítő csatornán lévő gombot!`);
            }

            // Auto-assign Guest Roles
            if (!member.user.bot) { // Don't assign to bots automatically unless intended
                const allRoles = await member.guild.roles.fetch();
                
                for (const roleName of GUEST_ROLES) {
                    const role = allRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                    if (role) {
                        try {
                            await member.roles.add(role);
                            console.log(`✅ Assigned role ${roleName} to new member ${member.user.tag}`);
                        } catch (err) {
                            console.error(`Failed to assign role ${roleName} to ${member.user.tag}:`, err);
                        }
                    } else {
                        console.warn(`Role ${roleName} not found for auto-assignment.`);
                    }
                }
            }
        });
    }

    private setupMessageMonitor() {
        this.client.on('messageCreate', async (message: Message) => {
            // Monitor specific channel
            if (message.channelId === '1461056761988382862') {
                if (message.author.bot) return; // Ignore bots

                // Check if user is admin
                if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return; // Allow admins to talk
                }

                // Delete message
                try {
                    await message.delete();

                    // Send DM warning
                    try {
                        await message.author.send(registrationMessage);
                    } catch (dmError) {
                        // User might have DMs disabled, ignore
                    }
                } catch (error) {
                    console.error('Failed to handle monitored message:', error);
                }
            }
        });
    }

    // Removed message-based setupVerificationHandler

    private async handleDeployVerify(interaction: ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: '❌ Nincs jogosultságod ehhez a parancshoz.', ephemeral: true });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🔐 Diák Hitelesítés')
            .setDescription('A versenyen való részvételhez és a szerveren a megfelelő rangok megkapásához hitelesítened kell magad az OM azonosítóddal.\n\nKattints az alábbi **"Azonosítás"** gombra, és írd be a 11 jegyű oktatási azonosítódat!')
            .setColor('#7c3aed' as ColorResolvable)
            .setFooter({ text: 'EsportHub Verification System' });

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Azonosítás')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🆔')
            );


        const channel = interaction.channel as TextChannel;
        if (channel && channel.send) {
            await channel.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: '✅ Hitelesítő üzenet elküldve!', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Nem tudtam elküldeni az üzenetet ebbe a csatornába.', ephemeral: true });
        }
    }

    private async handleVerifyButton(interaction: ButtonInteraction) {
        const modal = new ModalBuilder()
            .setCustomId('verify_modal')
            .setTitle('Diák Hitelesítés');

        const omInput = new TextInputBuilder()
            .setCustomId('om_input')
            .setLabel("Oktatási Azonosító (11 jegyű)")
            .setStyle(TextInputStyle.Short)
            .setMinLength(11)
            .setMaxLength(11)
            .setPlaceholder("pl. 71234567890")
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(omInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    private async handleVerifyModal(interaction: ModalSubmitInteraction) {
        const omId = interaction.fields.getTextInputValue('om_input');
        await interaction.deferReply({ ephemeral: true });
        await this.processVerification(interaction, omId);
    }

    private async handleOmCommand(interaction: ChatInputCommandInteraction) {
        const omId = interaction.options.getString('azonosito', true);
        await interaction.deferReply({ ephemeral: true });
        await this.processVerification(interaction, omId);
    }

    private async processVerification(interaction: ChatInputCommandInteraction | ModalSubmitInteraction, omId: string) {
        // Basic validation
        if (omId.length !== 11) { // Strict 11 chars
            await interaction.editReply('❌ Az oktatási azonosítónak pontosan 11 számjegyből kell állnia.');
            return;
        }

        try {
            // Find user by OM ID
            const user = await prisma.user.findFirst({
                where: { omId: omId }
            });

            if (!user) {
                await interaction.editReply(`❌ Nem található felhasználó a megadott OM azonosítóval (${omId}).\nKérlek ellenőrizd, hogy helyesen adtad-e meg, vagy regisztrálj előbb a weboldalon!`);
                return;
            }

            if (user.discordId && user.discordId !== interaction.user.id) {
                await interaction.editReply('❌ Ez az OM azonosító már össze van kapcsolva egy másik Discord fiókkal!');
                return;
            }

            // Update User with Discord ID
            await prisma.user.update({
                where: { id: user.id },
                data: { discordId: interaction.user.id }
            });

            // Sync User (Nickname + Roles)
            const result = await this.syncUser(user.id);
            if (result.success) {
                if (result.nicknameUpdated) {
                    await interaction.editReply(`✅ Sikeres hitelesítés! Üdvözöllek, **${user.displayName}**! A rangjaid és a neved frissítve lett.`);
                } else {
                    await interaction.editReply(`✅ Sikeres hitelesítés, de a nevedet nem tudtam módosítani (jogosultság). A rangjaid frissítve lettek.`);
                }
            } else {
                await interaction.editReply(`✅ Sikeres hitelesítés, de a szinkronizáció (rang/név) közben hiba történt: ${result.message || 'Ismeretlen hiba'}.`);
            }

        } catch (error) {
            console.error('Verification error:', error);
            await interaction.editReply('❌ Rendszerhiba történt a hitelesítés során.');
        }
    }

    public async syncUser(userId: string): Promise<{ success: boolean; nicknameUpdated: boolean; message?: string }> {
        if (!this.isReady) return { success: false, nicknameUpdated: false, message: 'Bot not ready' };

        try {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.discordId) return { success: false, nicknameUpdated: false, message: 'User or Discord ID missing' };

            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return { success: false, nicknameUpdated: false, message: 'Guild not found' };

            const member = await guild.members.fetch(user.discordId).catch(() => null);
            if (!member) return { success: false, nicknameUpdated: false, message: 'Member not found in guild' };

            let nicknameUpdated = false;

            // 1. Update Nickname
            if (user.displayName && member.displayName !== user.displayName) {
                if (member.manageable) {
                    try {
                        await member.setNickname(user.displayName);
                        console.log(`✅ Updated nickname for ${member.user.tag} to "${user.displayName}"`);
                        nicknameUpdated = true;
                    } catch (err) {
                        console.error('Failed to set nickname:', err);
                        // Don't fail the whole sync, just note it
                    }
                } else {
                    console.warn(`Cannot manage nickname for user ${member.user.tag} (Role hierarchy or owner)`);
                }
            } else if (member.displayName === user.displayName) {
                nicknameUpdated = true; // Already correct
            }

            // 2. Manage Roles
            const rolesToAdd: string[] = [...BASE_VERIFIED_ROLES];

            // Map UserRole to Discord Role Name
            if (user.role && DISCORD_ROLE_MAP[user.role as UserRole]) {
                rolesToAdd.push(DISCORD_ROLE_MAP[user.role as UserRole]);
            }

            // Resolve Roles
            const allRoles = await guild.roles.fetch();

            // Add Roles
            for (const roleName of rolesToAdd) {
                const role = allRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                if (role) {
                    await member.roles.add(role).catch(err => console.error(`Failed to add role ${roleName}:`, err));
                } else {
                    console.warn(`Role ${roleName} not found in guild.`);
                }
            }

            // Remove Guest Roles
            for (const roleName of GUEST_ROLES) {
                const role = allRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                if (role && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role).catch(err => console.error(`Failed to remove role ${roleName}:`, err));
                }
            }

            return { success: true, nicknameUpdated };

        } catch (error: any) {
            console.error('Sync user error:', error);
            return { success: false, nicknameUpdated: false, message: error.message };
        }
    }

    // ==========================================
    // OAuth 2.0 Implementation
    // ==========================================

    public async linkUserViaOAuth(userId: string, code: string): Promise<{ success: boolean; message?: string }> {
        try {
            // 1. Exchange Code for Token
            const tokenData = await this.exchangeCodeForToken(code);
            if (!tokenData || !tokenData.access_token) {
                return { success: false, message: 'Invalid OAuth code or token exchange failed' };
            }

            // 2. Get Discord User Info
            const discordUser = await this.getDiscordUser(tokenData.access_token);
            if (!discordUser || !discordUser.id) {
                return { success: false, message: 'Failed to fetch Discord user info' };
            }

            // 3. User Database Check
            // Check if this Discord ID is already linked to another user
            const existingLinkedUser = await prisma.user.findFirst({
                where: { discordId: discordUser.id }
            });

            if (existingLinkedUser) {
                if (existingLinkedUser.id === userId) {
                    // Already linked to CURRENT user
                    // Perform a sync just in case
                    await this.syncUser(userId);
                    return { success: true, message: 'A fiókod már össze volt kapcsolva. Adatok frissítve.' };
                } else {
                    // Linked to ANOTHER user
                    return { success: false, message: 'Ez a Discord fiók már egy másik felhasználóhoz van rendelve!' };
                }
            }

            // Check if current user is already linked (optional, maybe allow overwrite?)
            const currentUser = await prisma.user.findUnique({ where: { id: userId } });
            if (currentUser?.discordId) {
                // If they are re-linking effectively (maybe different discord account), allowed.
                // Just proceeding to update.
            }

            // 4. Update User Record
            await prisma.user.update({
                where: { id: userId },
                data: { discordId: discordUser.id }
            });

            console.log(`🔗 OAuth: Linked user ${currentUser?.username} to Discord ID ${discordUser.id}`);

            // 5. Trigger Sync (Nickname, Roles)
            // We use the fire-and-forget approach or await it. Since the user is waiting, awaiting is better for feedback.
            const syncResult = await this.syncUser(userId);

            if (!syncResult.success) {
                return { success: true, message: `Sikeres összekötés, de a szinkronizálásban hiba történt: ${syncResult.message}` };
            }

            return { success: true, message: 'Fiók sikeresen összekötve és szinkronizálva!' };

        } catch (error: any) {
            console.error('OAuth Link Error:', error);
            return { success: false, message: 'System error during linking' };
        }
    }

    private async exchangeCodeForToken(code: string) {
        const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = process.env;

        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
            throw new Error('Discord OAuth credentials not configured');
        }

        const params = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: DISCORD_REDIRECT_URI,
        });

        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: params,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Discord Token Exchange Failed:', errorText);
            return null;
        }

        return await response.json(); // { access_token, token_type, expires_in, refresh_token, scope }
    }

    private async getDiscordUser(accessToken: string) {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            console.error('Discord User Info Failed:', await response.text());
            return null;
        }

        return await response.json(); // { id, username, discriminator, avatar, ... }
    }

    private async handleRecheckCommand(interaction: ChatInputCommandInteraction) {
        // Double check admin permission just in case
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.reply({ content: '❌ Nincs jogosultságod ehhez a parancshoz.', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) {
                await interaction.editReply('❌ Nem találtam a szervert.');
                return;
            }

            await interaction.editReply('🔄 Felhasználók ellenőrzése folyamatban... Ez eltarthat egy ideig.');

            const members = await guild.members.fetch(); // Fetch all members
            const allRoles = await guild.roles.fetch();

            // Define roles that count as "Verified"
            const verifiedRoleNames = [...BASE_VERIFIED_ROLES, ...Object.values(DISCORD_ROLE_MAP)];
            const verifiedRoleIds = allRoles
                .filter(r => verifiedRoleNames.some(vr => vr.toLowerCase() === r.name.toLowerCase()))
                .map(r => r.id);

            // Define Guest role
            const guestRoleName = GUEST_ROLES[0] || 'Vendég';
            const guestRole = allRoles.find(r => r.name.toLowerCase() === guestRoleName.toLowerCase());

            if (!guestRole) {
                await interaction.editReply(`❌ Nem találom a(z) "${guestRoleName}" rangot a szerveren.`);
                return;
            }

            let checkedCount = 0;
            let unverifiedCount = 0;
            let updatedCount = 0;
            let failedCount = 0;

            for (const [_, member] of members) {
                if (member.user.bot) continue;
                checkedCount++;

                // Check if user has ANY verified role
                const isVerified = member.roles.cache.some(r => verifiedRoleIds.includes(r.id));

                if (!isVerified) {
                    unverifiedCount++;
                    // If not verified, ensure they have Guest role
                    if (!member.roles.cache.has(guestRole.id)) {
                        try {
                            await member.roles.add(guestRole);
                            updatedCount++;
                        } catch (err) {
                            console.error(`Failed to add role to ${member.user.tag}:`, err);
                            failedCount++;
                        }
                    }
                }
            }

            let replyMessage = `✅ **Ellenőrzés kész!**\n\n👥 Összes tag: ${checkedCount}\n❓ Nem hitelesített: ${unverifiedCount}\n➕ Vendég rang kiosztva: ${updatedCount}`;

            if (failedCount > 0) {
                replyMessage += `\n⚠️ **Sikertelen:** ${failedCount} (Jogosultság hiba? Ellenőrizd a bot rangjának sorrendjét!)`;
            }

            await interaction.editReply(replyMessage);

        } catch (error) {
            console.error('Recheck error:', error);
            await interaction.editReply('❌ Hiba történt a ellenőrzés során.');
        }
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
                // Ensure Role exists for this game (optional, keeping it as is)
                await this.ensureRoleExists(gameName);
            }

            // Sanitize channel name
            const channelName = this.sanitizeName(tournamentName);

            // Fetch Verified Roles
            const allRoles = await guild.roles.fetch();
            const verifiedRoles = allRoles.filter(r => BASE_VERIFIED_ROLES.some(vr => vr.toLowerCase() === r.name.toLowerCase()));

            const permissionOverwrites = [
                {
                    id: guild.id, // @everyone
                    allow: [],
                    deny: [PermissionsBitField.Flags.ViewChannel], // Hidden for everyone
                },
                {
                    id: this.client.user!.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Connect],
                },
            ];

            // Add Verified Roles Permissions
            for (const role of verifiedRoles.values()) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: [PermissionsBitField.Flags.ViewChannel],
                    deny: [],
                } as any);
            }


            // 2. Create Text Channel (Info/Chat)
            const textChannel = await guild.channels.create({
                name: `🏆-${channelName}`,
                type: ChannelType.GuildText,
                parent: targetCategoryId || undefined,
                permissionOverwrites,
                topic: `Official channel for ${tournamentName}`,
            });

            // 3. Create Results Channel
            const resultsChannel = await guild.channels.create({
                name: `📊-${channelName}-eredmények`,
                type: ChannelType.GuildText,
                parent: targetCategoryId || undefined,
                permissionOverwrites: [
                    ...permissionOverwrites,
                    {
                        id: guild.id, // Overwrite @everyone again just to be safe/explicit, though base list has it
                        deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    // Make it read-only for verified users (they can view, but not send)
                    ...verifiedRoles.map(role => ({
                        id: role.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                        deny: [PermissionsBitField.Flags.SendMessages]
                    }))
                ],
                topic: `Results for ${tournamentName}`,
            });


            // 4. Create Voice Channel
            const voiceChannel = await guild.channels.create({
                name: `🔊 ${tournamentName}`,
                type: ChannelType.GuildVoice,
                parent: targetCategoryId || undefined,
                permissionOverwrites: [
                    ...permissionOverwrites,
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel], // Double check hidden
                    },
                    // Allow verified to connect/speak
                    ...verifiedRoles.map(role => ({
                        id: role.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
                    }))
                ],
            });

            console.log(`✅ Created Discord channels for ${tournamentName}: Text(${textChannel.id}), Results(${resultsChannel.id}), Voice(${voiceChannel.id})`);

            // Optional: Send welcome message to text channel
            //await textChannel.send(`**${tournamentName}** csatorna létrehozva! A részvételhez és a látáshoz _Verified_ vagy _Tag_ rang szükséges.`);

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

    /**
     * Attempts to find a Discord member ID by username (for auto-linking)
     */
    async findDiscordIdByUsername(username: string): Promise<string | null> {
        if (!this.isReady) return null;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return null;

            // Search by username
            // Note: This is a fuzzy search, so we must verify exact match
            const members = await guild.members.search({ query: username, limit: 5 });

            // Find exact match on username (ignoring case usually safe for auto-link if names are unique enough)
            // Modern Discord usernames are lowercase.
            const match = members.find(m =>
                m.user.username.toLowerCase() === username.toLowerCase() ||
                m.user.globalName?.toLowerCase() === username.toLowerCase()
            );

            if (match) {
                console.log(`✅ Found Discord match for username "${username}": ${match.user.tag} (${match.id})`);
                return match.id;
            }

            return null;
        } catch (error) {
            console.error('Failed to find discord member by username:', error);
            return null;
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

    /**
     * Send a Direct Message to a Discord user
     */
    async sendDM(discordId: string, embedData: DiscordEmbed): Promise<boolean> {
        if (!this.isReady) return false;

        try {
            const user = await this.client.users.fetch(discordId);
            if (!user) {
                console.warn(`Discord user ${discordId} not found`);
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

            await user.send({ embeds: [embed] });
            return true;

        } catch (error: any) {
            // User might have DMs disabled
            if (error.code === 50007) {
                console.warn(`Cannot send DM to ${discordId} - user has DMs disabled`);
            } else {
                console.error(`Failed to send DM to ${discordId}:`, error);
            }
            return false;
        }
    }

    /**
     * Add a role to a Discord user
     */
    async addRoleToUser(discordId: string, roleId: string): Promise<boolean> {
        if (!this.isReady) return false;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return false;

            const member = await guild.members.fetch(discordId);
            if (!member) return false;

            await member.roles.add(roleId);
            return true;
        } catch (error) {
            console.error(`Failed to add role ${roleId} to user ${discordId}:`, error);
            return false;
        }
    }

    /**
     * Remove a role from a Discord user
     */
    async removeRoleFromUser(discordId: string, roleId: string): Promise<boolean> {
        if (!this.isReady) return false;

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return false;

            const member = await guild.members.fetch(discordId);
            if (!member) return false;

            await member.roles.remove(roleId);
            return true;
        } catch (error) {
            console.error(`Failed to remove role ${roleId} from user ${discordId}:`, error);
            return false;
        }
    }

    /**
     * Get list of available text channels
     */
    async getAvailableChannels(): Promise<Array<{ id: string; name: string; category?: string }>> {
        if (!this.isReady) return [];

        try {
            const guild = await this.client.guilds.fetch(this.guildId);
            if (!guild) return [];

            const channels = await guild.channels.fetch();
            const textChannels: Array<{ id: string; name: string; category?: string }> = [];

            channels.forEach(channel => {
                if (channel && channel.type === ChannelType.GuildText) {
                    textChannels.push({
                        id: channel.id,
                        name: channel.name,
                        category: channel.parent?.name
                    });
                }
            });

            return textChannels.sort((a, b) => {
                if (a.category === b.category) return a.name.localeCompare(b.name);
                return (a.category || '').localeCompare(b.category || '');
            });
        } catch (error) {
            console.error('Failed to get available channels:', error);
            return [];
        }
    }

}

export const discordService = new DiscordService();
