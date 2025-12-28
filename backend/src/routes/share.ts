import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /share/tournaments/:id
router.get('/tournaments/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                game: true,
                _count: {
                    select: { entries: true }
                }
            }
        });

        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }

        const title = `${tournament.name} | EsportHub`;

        // Format date: "2023. dec. 21. 18:00"
        const startDate = new Date(tournament.startDate).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Determine status text
        const statusMap: Record<string, string> = {
            'DRAFT': 'Tervezet',
            'REGISTRATION': 'Nevezés Nyitva',
            'IN_PROGRESS': 'Folyamatban',
            'COMPLETED': 'Lezárult'
        };
        const status = statusMap[tournament.status] || tournament.status;

        const currentTeams = tournament._count.entries;

        // Construct rich description
        const description = [
            `🎮 Játék: ${tournament.game?.name || 'Ismeretlen'}`,
            `📅 Kezdés: ${startDate}`,
            `🏆 Státusz: ${status}`,
            `👥 ${currentTeams}/${tournament.maxTeams} résztvevő`,
            '', // Empty line
            tournament.description ? `📝 ${tournament.description.substring(0, 150)}${tournament.description.length > 150 ? '...' : ''}` : ''
        ].filter(Boolean).join('\n');

        const imageUrl = tournament.imageUrl || tournament.game?.imageUrl || 'https://esport.pollak.info/assets/default-tournament.png';
        const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${id}`;

        // Discord embeds use theme-color
        const themeColor = '#8b5cf6'; // EsportHub Purple

        // Return HTML with Open Graph tags
        const html = `
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- Open Graph / Facebook -->
                <meta property="og:site_name" content="EsportHub">
                <meta property="og:type" content="website">
                <meta property="og:url" content="${frontendUrl}">
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">
                <meta name="theme-color" content="${themeColor}">

                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${frontendUrl}">
                <meta property="twitter:title" content="${title}">
                <meta property="twitter:description" content="${description}">
                <meta property="twitter:image" content="${imageUrl}">

                <!-- Redirect to frontend -->
                <meta http-equiv="refresh" content="0;url=${frontendUrl}">
                
                <title>${title}</title>
            </head>
            <body>
                <p>Redirecting to tournament...</p>
                <script>window.location.href = "${frontendUrl}";</script>
            </body>
            </html>
        `;

        res.send(html);
    } catch (error) {
        console.error('Share route error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export const shareRouter = router;
