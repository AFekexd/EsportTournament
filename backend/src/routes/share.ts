import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const shareRouter: Router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://esport.pollak.info').replace(/\/+$/, '');

function escapeHtml(str: unknown): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeImageUrl(rawUrl: string | null | undefined, fallback: string): string {
    if (!rawUrl) return fallback;
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch {
        // invalid URL
    }
    return fallback;
}

// Share Team
shareRouter.get('/teams/:id', asyncHandler(async (req: Request, res: Response) => {
    const rawTeamId = req.params.id as string;

    if (!rawTeamId || !/^[a-zA-Z0-9.\-_]+$/.test(rawTeamId)) {
        return res.status(400).send('Érvénytelen csapat azonosító');
    }

    const team = await prisma.team.findUnique({
        where: { id: rawTeamId },
        include: { _count: { select: { members: true, tournamentEntries: true } } }
    });

    if (!team) {
        return res.status(404).send('Csapat nem található');
    }

    const teamData = team as any;
    const memberCount = teamData._count?.members || 0;
    const tournamentCount = teamData._count?.tournamentEntries || 0;

    const rawTitle = `${team.name} | EsportHub`;
    const cleanDesc = (team.description || '').replace(/\s+/g, ' ').trim();
    const rawDescription = `Csatlakozz a(z) ${team.name} csapathoz! ELO: ${team.elo} • Tagok: ${memberCount} • Versenyek: ${tournamentCount}. ${cleanDesc.substring(0, 100)}${cleanDesc.length > 100 ? '...' : ''}`;
    const rawImage = sanitizeImageUrl(team.logoUrl, `${FRONTEND_URL}/esportlogo.png`);
    const targetUrl = `${FRONTEND_URL}/teams/${encodeURIComponent(team.id)}`;

    // Safe escaped values for HTML rendering
    const safeTitle = escapeHtml(rawTitle);
    const safeDescription = escapeHtml(rawDescription);
    const safeImage = escapeHtml(rawImage);
    const safeUrl = escapeHtml(targetUrl);
    const safeTeamName = escapeHtml(team.name);
    const jsonTargetUrl = JSON.stringify(targetUrl);

    const html = `<!DOCTYPE html>
<html lang="hu">
    <head>
        <meta charset="UTF-8">
        <title>${safeTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:url" content="${safeUrl}">
        <meta property="og:title" content="${safeTitle}">
        <meta property="og:description" content="${safeDescription}">
        <meta property="og:image" content="${safeImage}">
        
        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:url" content="${safeUrl}">
        <meta property="twitter:title" content="${safeTitle}">
        <meta property="twitter:description" content="${safeDescription}">
        <meta property="twitter:image" content="${safeImage}">
        
        <meta name="theme-color" content="#8b5cf6">
        
        <script>
            window.location.replace(${jsonTargetUrl});
        </script>
    </head>
    <body style="background: #0f1015; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
        <p>Átirányítás ide: <a href="${safeUrl}" style="color: #8b5cf6;">${safeTeamName}</a>...</p>
    </body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}));
