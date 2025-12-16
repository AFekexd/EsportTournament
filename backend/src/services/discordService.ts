interface DiscordEmbed {
    title: string;
    description?: string;
    color: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp?: string;
}

/**
 * Discord Service for sending webhook notifications
 * 
 * IMPORTANT: Supports multiple webhooks for different channels.
 * Configure in backend/.env:
 * - DISCORD_WEBHOOK_ANNOUNCEMENTS - Általános hirdetmények
 * - DISCORD_WEBHOOK_TOURNAMENTS - Verseny értesítések
 * - DISCORD_WEBHOOK_MATCHES - Meccs eredmények
 * - DISCORD_WEBHOOK_GENERAL - Általános üzenetek
 */
class DiscordService {
    private webhooks: Map<string, string> = new Map();
    private enabled: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const {
            DISCORD_WEBHOOK_ANNOUNCEMENTS,
            DISCORD_WEBHOOK_TOURNAMENTS,
            DISCORD_WEBHOOK_MATCHES,
            DISCORD_WEBHOOK_GENERAL,
        } = process.env;

        // Register all available webhooks
        if (DISCORD_WEBHOOK_ANNOUNCEMENTS) {
            this.webhooks.set('announcements', DISCORD_WEBHOOK_ANNOUNCEMENTS);
        }
        if (DISCORD_WEBHOOK_TOURNAMENTS) {
            this.webhooks.set('tournaments', DISCORD_WEBHOOK_TOURNAMENTS);
        }
        if (DISCORD_WEBHOOK_MATCHES) {
            this.webhooks.set('matches', DISCORD_WEBHOOK_MATCHES);
        }
        if (DISCORD_WEBHOOK_GENERAL) {
            this.webhooks.set('general', DISCORD_WEBHOOK_GENERAL);
        }

        this.enabled = this.webhooks.size > 0;

        if (this.enabled) {
            console.log(`✅ Discord service initialized with ${this.webhooks.size} webhook(s)`);
            console.log(`   Available channels: ${Array.from(this.webhooks.keys()).join(', ')}`);
        } else {
            console.log('⚠️  Discord service disabled (no webhooks configured)');
        }
    }

    getAvailableChannels(): string[] {
        return Array.from(this.webhooks.keys());
    }

    async sendWebhook(embed: DiscordEmbed, content?: string, channel: string = 'general'): Promise<boolean> {
        if (!this.enabled) {
            console.log('Discord webhook not sent (service disabled):', embed.title);
            return false;
        }

        const webhookUrl = this.webhooks.get(channel);
        if (!webhookUrl) {
            console.error(`Discord webhook not found for channel: ${channel}`);
            console.log(`Available channels: ${Array.from(this.webhooks.keys()).join(', ')}`);
            return false;
        }

        try {
            const payload: any = {
                embeds: [embed],
            };

            // Add content for @ mentions
            if (content) {
                payload.content = content;
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                console.log(`🔔 Discord webhook sent to ${channel}: ${embed.title}`);
                return true;
            } else {
                console.error('Discord webhook failed:', await response.text());
                return false;
            }
        } catch (error) {
            console.error('Failed to send Discord webhook:', error);
            return false;
        }
    }

    async sendTournamentAnnouncement(tournament: { name: string; game: string; startDate: Date; maxTeams: number; id: string }) {
        return this.sendWebhook({
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
        }, undefined, 'tournaments');
    }

    async sendMatchResult(match: { tournament: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; winner: string }, channel: string = 'matches') {
        const isHomeWinner = match.winner === match.homeTeam;
        return this.sendWebhook({
            title: '⚔️ Meccs Eredmény',
            description: `**${match.tournament}**`,
            color: 0x22c55e, // Green
            fields: [
                { name: isHomeWinner ? '🏆 ' + match.homeTeam : match.homeTeam, value: match.homeScore.toString(), inline: true },
                { name: 'vs', value: '-', inline: true },
                { name: !isHomeWinner ? '🏆 ' + match.awayTeam : match.awayTeam, value: match.awayScore.toString(), inline: true },
            ],
            timestamp: new Date().toISOString(),
        }, undefined, channel);
    }

    async sendLeaderboardUpdate(leaderboard: { game: string; topPlayers: Array<{ name: string; elo: number; rank: number }> }) {
        const fields = leaderboard.topPlayers.map((player) => ({
            name: `${player.rank}. ${player.name}`,
            value: `${player.elo} ELO`,
            inline: false,
        }));

        return this.sendWebhook({
            title: '📊 Ranglista Frissítés',
            description: `**${leaderboard.game}** - Top játékosok`,
            color: 0xf59e0b, // Amber
            fields,
            timestamp: new Date().toISOString(),
        });
    }

    async sendSystemAnnouncement(title: string, message: string) {
        return this.sendWebhook({
            title: `📢 ${title}`,
            description: message,
            color: 0x3b82f6, // Blue
            timestamp: new Date().toISOString(),
        });
    }
}

export const discordService = new DiscordService();
