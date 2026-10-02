/**
 * RAWG Video Games Database API Service
 * Secure service to search and fetch games globally with caching and fallback support.
 */

export interface RawgGame {
    id: number | string;
    name: string;
    slug: string;
    backgroundImage: string | null;
    rating?: number;
    genres?: string[];
    released?: string;
    teamSize?: number;
}

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

// Curated popular esport games fallback
const POPULAR_ESPORT_GAMES: RawgGame[] = [
    {
        id: 'cs2',
        name: 'Counter-Strike 2',
        slug: 'counter-strike-2',
        backgroundImage: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg',
        rating: 4.5,
        genres: ['FPS', 'Tactical Shooter', 'Esports'],
        teamSize: 5
    },
    {
        id: 'lol',
        name: 'League of Legends',
        slug: 'league-of-legends',
        backgroundImage: 'https://cdn1.epicgames.com/offer/24b9b5e323bc40eea252a10cdd3b2f10/EGS_LeagueofLegends_RiotGames_S1_2560x1440-47eb328eac5ddd63ebd096ded7d0d5ab',
        rating: 4.4,
        genres: ['MOBA', 'Strategy', 'Esports'],
        teamSize: 5
    },
    {
        id: 'valorant',
        name: 'Valorant',
        slug: 'valorant',
        backgroundImage: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt5c61e4e61f7f5e5e/valorant-logo.png',
        rating: 4.3,
        genres: ['FPS', 'Hero Shooter', 'Esports'],
        teamSize: 5
    },
    {
        id: 'rocket-league',
        name: 'Rocket League',
        slug: 'rocket-league',
        backgroundImage: 'https://rocketleague.media.zestyio.com/rl-logo.png',
        rating: 4.6,
        genres: ['Sports', 'Racing', 'Esports'],
        teamSize: 3
    },
    {
        id: 'dota-2',
        name: 'Dota 2',
        slug: 'dota-2',
        backgroundImage: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota2_social.jpg',
        rating: 4.2,
        genres: ['MOBA', 'Strategy', 'Esports'],
        teamSize: 5
    },
    {
        id: 'rainbow-six-siege',
        name: 'Tom Clancy\'s Rainbow Six Siege',
        slug: 'tom-clancys-rainbow-six-siege',
        backgroundImage: 'https://staticctf.akamaized.net/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/3x13iX4pLqY5O3r9wz9p3/80092c25e839e559389ca730a99622d4/R6S_SEO_IMAGE.jpg',
        rating: 4.3,
        genres: ['Tactical Shooter', 'FPS', 'Esports'],
        teamSize: 5
    },
    {
        id: 'overwatch-2',
        name: 'Overwatch 2',
        slug: 'overwatch-2',
        backgroundImage: 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltbdf94f1c1f06be36/62b477b5a8e63b1154c1bebf/Overwatch2_ShareImage.jpg',
        rating: 4.1,
        genres: ['Hero Shooter', 'FPS', 'Esports'],
        teamSize: 5
    },
    {
        id: 'apex-legends',
        name: 'Apex Legends',
        slug: 'apex-legends',
        backgroundImage: 'https://media.contentapi.ea.com/content/dam/apex-legends/images/2019/01/apex-featured-image-16x9.jpg.adapt.crop191x100.1200w.jpg',
        rating: 4.3,
        genres: ['Battle Royale', 'FPS', 'Esports'],
        teamSize: 3
    },
    {
        id: 'ea-fc-24',
        name: 'EA SPORTS FC 24',
        slug: 'ea-sports-fc-24',
        backgroundImage: 'https://media.contentapi.ea.com/content/dam/ea/fc/fc-24/common/fc24-featured-image-16x9.jpg.adapt.crop191x100.1200w.jpg',
        rating: 4.0,
        genres: ['Sports', 'Football', 'Esports'],
        teamSize: 1
    },
    {
        id: 'fortnite',
        name: 'Fortnite',
        slug: 'fortnite',
        backgroundImage: 'https://cdn2.unrealengine.com/14br-consoles-1920x1080-wlogo-1920x1080-432080126.jpg',
        rating: 4.4,
        genres: ['Battle Royale', 'Third-Person Shooter', 'Esports'],
        teamSize: 2
    }
];

class RawgService {
    private readonly baseUrl = 'https://api.rawg.io/api';
    private readonly cache = new Map<string, CacheEntry<any>>();
    private readonly cacheTtlMs = 15 * 60 * 1000; // 15 minutes

    private getApiKey(): string | null {
        const key = process.env.RAWG_API_KEY;
        return key && key.trim().length > 0 ? key.trim() : null;
    }

    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data as T;
    }

    private setCache<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.cacheTtlMs
        });
    }

    /**
     * Search games or get top games from RAWG API
     * Safely validates inputs and provides fallbacks
     */
    async searchGames(query?: string, page: number = 1, pageSize: number = 20): Promise<{ games: RawgGame[]; total: number }> {
        const sanitizedQuery = (query || '')
            .replace(/[^\w\s-]/gi, '')
            .trim()
            .substring(0, 80);

        const safePage = Math.max(1, Math.min(page, 50));
        const safePageSize = Math.max(1, Math.min(pageSize, 40));

        const cacheKey = `search:${sanitizedQuery}:${safePage}:${safePageSize}`;
        const cached = this.getFromCache<{ games: RawgGame[]; total: number }>(cacheKey);
        if (cached) {
            return cached;
        }

        const apiKey = this.getApiKey();

        // If no API key configured, use our rich esports fallback
        if (!apiKey) {
            let filtered = POPULAR_ESPORT_GAMES;
            if (sanitizedQuery.length > 0) {
                const qLower = sanitizedQuery.toLowerCase();
                filtered = POPULAR_ESPORT_GAMES.filter(g =>
                    g.name.toLowerCase().includes(qLower) ||
                    g.slug.toLowerCase().includes(qLower) ||
                    g.genres?.some(genre => genre.toLowerCase().includes(qLower))
                );
            }
            return {
                games: filtered,
                total: filtered.length
            };
        }

        try {
            const url = new URL(`${this.baseUrl}/games`);
            url.searchParams.set('key', apiKey);
            url.searchParams.set('page', String(safePage));
            url.searchParams.set('page_size', String(safePageSize));

            if (sanitizedQuery.length > 0) {
                url.searchParams.set('search', sanitizedQuery);
            } else {
                // Default order: popular & highly rated
                url.searchParams.set('ordering', '-rating');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

            const response = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[RAWG] API error: ${response.status} ${response.statusText}`);
                return this.getFallbackGames(sanitizedQuery);
            }

            const data = await response.json() as any;
            const results: any[] = Array.isArray(data?.results) ? data.results : [];

            const games: RawgGame[] = results.map(item => ({
                id: item.id,
                name: item.name,
                slug: item.slug,
                backgroundImage: item.background_image || null,
                rating: typeof item.rating === 'number' ? item.rating : undefined,
                genres: Array.isArray(item.genres) ? item.genres.map((g: any) => g.name) : [],
                released: item.released || undefined,
                teamSize: this.inferTeamSize(item.name)
            }));

            const result = {
                games,
                total: typeof data?.count === 'number' ? data.count : games.length
            };

            this.setCache(cacheKey, result);
            return result;
        } catch (error) {
            console.error('[RAWG] Request failed, using fallback:', error instanceof Error ? error.message : error);
            return this.getFallbackGames(sanitizedQuery);
        }
    }

    private getFallbackGames(query?: string): { games: RawgGame[]; total: number } {
        if (!query) {
            return { games: POPULAR_ESPORT_GAMES, total: POPULAR_ESPORT_GAMES.length };
        }
        const q = query.toLowerCase();
        const matches = POPULAR_ESPORT_GAMES.filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.slug.toLowerCase().includes(q)
        );
        return { games: matches, total: matches.length };
    }

    /**
     * Guess sensible default team size based on common game names
     */
    private inferTeamSize(name: string): number {
        const lower = name.toLowerCase();
        if (lower.includes('league of legends') || lower.includes('counter-strike') || lower.includes('cs2') || lower.includes('valorant') || lower.includes('dota') || lower.includes('rainbow six') || lower.includes('overwatch')) {
            return 5;
        }
        if (lower.includes('rocket league') || lower.includes('apex legends')) {
            return 3;
        }
        if (lower.includes('fortnite')) {
            return 2;
        }
        return 1;
    }
}

export const rawgService = new RawgService();
