import prisma from "../lib/prisma.js";

const STEAM_API_KEY = process.env.STEAM_API_KEY || "7727AE3836768E83ED71477FCBAFEFCC"; // Ensure this is set in .env
const STEAM_API_BASE = "http://api.steampowered.com";

interface SteamGame {
    appid: number;
    name: string;
    playtime_forever: number;
    img_icon_url: string;
}

interface SteamAchievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
}

export class SteamService {
    async syncUserPerfectGames(userId: string, steamId: string) {
        if (!STEAM_API_KEY) {
            throw new Error("STEAM_API_KEY not configured");
        }

        // 1. Get Owned Games
        const ownedGamesUrl = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=true`;

        const response = await fetch(ownedGamesUrl);
        const data = await response.json();

        if (!data.response || !data.response.games) {
            // Maybe profile is private or no games
            return 0;
        }

        const games: SteamGame[] = data.response.games;

        // Sort by playtime (descending) to prioritize played games
        // Limiting to top 30 games to avoid timeouts/rate limits for this demo
        // In production, this should be a background job queue
        const topGames = games
            .sort((a, b) => b.playtime_forever - a.playtime_forever)
            .slice(0, 30);

        let perfectCount = 0;

        for (const game of topGames) {
            // Skip if playtime < 60 minutes (unlikely to be platinum, optimization)
            if (game.playtime_forever < 60) continue;

            try {
                const statsUrl = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${game.appid}&key=${STEAM_API_KEY}&steamid=${steamId}`;
                const statsRes = await fetch(statsUrl);

                if (statsRes.status === 400) {
                    // Game might not have achievements or stats
                    continue;
                }

                const statsData = await statsRes.json();

                if (statsData.playerstats && statsData.playerstats.achievements) {
                    const achievements: SteamAchievement[] = statsData.playerstats.achievements;
                    const total = achievements.length;

                    if (total > 0) {
                        const unlocked = achievements.filter(a => a.achieved === 1).length;
                        if (unlocked === total) {
                            perfectCount++;
                        }
                    }
                }
            } catch (err) {
                console.error(`Error fetching stats for game ${game.appid}:`, err);
            }
        }

        // Update User
        await prisma.user.update({
            where: { id: userId },
            data: {
                perfectGamesCount: perfectCount
            }
        });

        return perfectCount;
    }
}

export const steamService = new SteamService();
