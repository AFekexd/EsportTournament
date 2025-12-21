import express, { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = express.Router();

// GET /share/tournaments/:id
router.get('/tournaments/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: { game: true }
        });

        if (!tournament) {
            return res.status(404).send('Tournament not found');
        }

        const title = tournament.name;
        const description = tournament.description || `Check out the ${tournament.name} tournament on EsportHub!`;
        const imageUrl = tournament.game?.imageUrl || 'https://esport.afeke.com/assets/default-tournament.png'; // Fallback image
        const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${id}`;

        // Return HTML with Open Graph tags
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="website">
                <meta property="og:url" content="${frontendUrl}">
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${imageUrl}">

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
