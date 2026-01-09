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

        let steamAvatar = null;
        let steamUrl = null;
        let steamCreatedAt = null;
        let steamLevel = null;

        // 0. Get Player Summary (Avatar, URL, CreatedAt)
        try {
            const summaryUrl = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
            const summaryRes = await fetch(summaryUrl);
            const summaryData = await summaryRes.json();
            const player = summaryData.response?.players?.[0];

            if (player) {
                steamAvatar = player.avatarfull;
                steamUrl = player.profileurl;
                if (player.timecreated) {
                    steamCreatedAt = new Date(player.timecreated * 1000);
                }
            }
        } catch (e) {
            console.error("Failed to fetch steam summary", e);
        }

        // 0.5 Get Steam Level
        try {
            const levelUrl = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${steamId}`;
            const levelRes = await fetch(levelUrl);
            const levelData = await levelRes.json();
            if (levelData.response) {
                steamLevel = levelData.response.player_level;
            }
        } catch (e) {
            console.error("Failed to fetch steam level", e);
        }

        // 1. Get Owned Games
        const ownedGamesUrl = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=true`;

        const response = await fetch(ownedGamesUrl);
        const data = await response.json();

        let perfectCount = 0;

        if (data.response && data.response.games) {
            const games: SteamGame[] = data.response.games;

            // Sort by playtime (descending) to prioritize played games
            // Limiting to top 30 games to avoid timeouts/rate limits for this demo
            // In production, this should be a background job queue
            const topGames = games
                .sort((a, b) => b.playtime_forever - a.playtime_forever)
                .slice(0, 30);

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
        }

        // Update User
        await prisma.user.update({
            where: { id: userId },
            data: {
                perfectGamesCount: perfectCount,
                steamAvatar,
                steamUrl,
                steamCreatedAt,
                steamLevel
            }
        });

        return {
            count: perfectCount,
            steamAvatar,
            steamUrl,
            steamCreatedAt,
            steamLevel
        };
    }
}

export const steamService = new SteamService();
