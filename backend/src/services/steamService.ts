import prisma from "../lib/prisma.js";

const STEAM_API_KEY = process.env.STEAM_API_KEY || "7727AE3836768E83ED71477FCBAFEFCC"; // Ensure this is set in .env
const STEAM_API_BASE = "https://api.steampowered.com";

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
        let steamPersonaname = null;

        // 0. Get Player Summary (Avatar, URL, CreatedAt)
        try {
            const summaryUrl = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
            const summaryRes = await fetch(summaryUrl);
            const summaryText = await summaryRes.text();

            if (!summaryRes.ok) {
                console.error(`Steam API Summary Error (${summaryRes.status}): ${summaryText.substring(0, 200)}`);
            } else {
                try {
                    const summaryData = JSON.parse(summaryText);
                    const player = summaryData.response?.players?.[0];

                    if (player) {
                        steamAvatar = player.avatarfull;
                        steamUrl = player.profileurl;
                        steamPersonaname = player.personaname;
                        if (player.timecreated) {
                            steamCreatedAt = new Date(player.timecreated * 1000);
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse steam summary JSON", e);
                    console.error("Received Text:", summaryText.substring(0, 200));
                }
            }
        } catch (e) {
            console.error("Failed to fetch steam summary", e);
        }

        // 0.5 Get Steam Level
        try {
            const levelUrl = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${steamId}`;
            const levelRes = await fetch(levelUrl);
            const levelText = await levelRes.text();

            if (!levelRes.ok) {
                console.error(`Steam API Level Error (${levelRes.status}): ${levelText.substring(0, 200)}`);
            } else {
                try {
                    const levelData = JSON.parse(levelText);
                    if (levelData.response) {
                        steamLevel = levelData.response.player_level;
                    }
                } catch (e) {
                    console.error("Failed to parse steam level JSON", e);
                    console.error("Received Text:", levelText.substring(0, 200));
                }
            }
        } catch (e) {
            console.error("Failed to fetch steam level", e);
        }

        // 1. Get Owned Games
        const ownedGamesUrl = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json&include_appinfo=true`;

        const response = await fetch(ownedGamesUrl);
        const responseText = await response.text();

        let data: any = {};
        if (!response.ok) {
            console.error(`Steam API OwnedGames Error (${response.status}): ${responseText.substring(0, 200)}`);
            // Proceed with empty data or handle as needed, for now we just log
        } else {
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse owned games JSON", e);
                console.error("Received Text:", responseText.substring(0, 200));
            }
        }

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

                    const statsText = await statsRes.text();
                    let statsData: any = {};

                    if (!statsRes.ok) {
                        console.error(`Steam API Stats Error (${statsRes.status}) for app ${game.appid}: ${statsText.substring(0, 200)}`);
                        continue;
                    }

                    try {
                        statsData = JSON.parse(statsText);
                    } catch (e) {
                        console.error(`Failed to parse stats JSON for app ${game.appid}`, e);
                        continue;
                    }

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
                steamLevel,
                steamPersonaname
            }
        });

        return {
            count: perfectCount,
            steamAvatar,
            steamUrl,
            steamCreatedAt,
            steamLevel,
            steamPersonaname
        };
    }
}

export const steamService = new SteamService();
