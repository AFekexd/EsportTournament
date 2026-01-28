import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const shareRouter: Router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://esport.pollak.info';

// Share Team
shareRouter.get('/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const teamId = req.params.id as string;
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { _count: { select: { members: true, tournamentEntries: true } } }
    });

    if (!team) {
        return res.status(404).send('Csapat nem található');
    }

    const teamData = team as any;
    const memberCount = teamData._count?.members || 0;
    const tournamentCount = teamData._count?.tournamentEntries || 0;

    const title = `${team.name} | EsportHub`;
    const description = `Csatlakozz a(z) ${team.name} csapathoz! ELO: ${team.elo} • Tagok: ${memberCount} • Versenyek: ${tournamentCount}. ${team.description ? team.description.substring(0, 100) + (team.description.length > 100 ? '...' : '') : ''}`;
    const image = team.logoUrl || `${FRONTEND_URL}/esportlogo.png`;
    const url = `${FRONTEND_URL}/teams/${teamId}`;

    const html = `
        <!DOCTYPE html>
        <html lang="hu">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="website">
                <meta property="og:url" content="${url}">
                <meta property="og:title" content="${title}">
                <meta property="og:description" content="${description}">
                <meta property="og:image" content="${image}">
                
                <!-- Twitter -->
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="${url}">
                <meta property="twitter:title" content="${title}">
                <meta property="twitter:description" content="${description}">
                <meta property="twitter:image" content="${image}">
                
                <meta name="theme-color" content="#8b5cf6">
                
                <script>
                    window.location.href = "${url}";
                </script>
            </head>
            <body style="background: #0f1015; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
                <p>Átirányítás ide: <a href="${url}" style="color: #8b5cf6;">${team.name}</a>...</p>
            </body>
        </html>
    `;

    res.send(html);
}));
