import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';

const router: express.Router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { userId, signature } = req.query;

        if (!userId || !signature || typeof userId !== 'string' || typeof signature !== 'string') {
            return res.status(400).send(renderErrorPage('Érvénytelen kérés', 'Hiányzó paraméterek.'));
        }

        // 1. Verify Signature
        const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(userId);
        const expectedSignature = hmac.digest('hex');

        // Timing safe compare prevents timing attacks
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
            return res.status(403).send(renderErrorPage('Érvénytelen aláírás', 'A leiratkozási link érvénytelen vagy módosítva lett.'));
        }

        // 2. Update User Preferences
        // The user requested to unsubscribe from "all non-direct emails".
        // We will disable the master toggle or granular marketing preferences.
        // For now, let's disable the master toggle as it's the safest "unsubscribe from all" option.
        // Or strictly granular ones: tournaments, matches notifications?
        // Let's stick to granular to be less destructive if possible, OR master toggle if that's what "unsubscribe" usually implies.
        // "Minden nem direkt emailről" -> All notifications.
        
        await prisma.user.update({
            where: { id: userId },
            data: {
                // Disable all optional notification categories
                emailPrefTournaments: false,
                emailPrefMatches: false, // These are kind of "direct" but also frequent spam if you don't play.
                emailPrefSystem: false,
                emailPrefWeeklyDigest: false,
                emailPrefBookings: true, // Keep bookings as they are transactional/receipts usually.
                // Or maybe just flip the master switch?
                // emailNotifications: false // This kills everything including Admin Broadcasts potentially? No.
            }
        });

        // 3. Return Success Page
        res.send(renderSuccessPage());

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).send(renderErrorPage('Hiba történt', 'Belső szerverhiba történt a feldolgozás során.'));
    }
});

function renderSuccessPage() {
    return `
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sikeres leiratkozás</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #0a0a0f; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #111118; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; border: 1px solid rgba(139, 92, 246, 0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .icon { font-size: 48px; margin-bottom: 24px; display: inline-block; }
        h1 { margin: 0 0 16px; color: #fff; font-size: 24px; }
        p { color: #888; line-height: 1.6; margin-bottom: 32px; }
        .btn { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.2s; }
        .btn:hover { background: #7c3aed; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>Sikeres leiratkozás</h1>
        <p>A beállításaidat frissítettük. Többé nem fogsz értesítéseket kapni a nem létfontosságú eseményekről.</p>
        <a href="/" class="btn">Vissza a főoldalra</a>
    </div>
</body>
</html>
    `;
}

function renderErrorPage(title: string, message: string) {
    return `
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hiba</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #0a0a0f; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { background: #111118; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; width: 90%; border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .icon { font-size: 48px; margin-bottom: 24px; display: inline-block; }
        h1 { margin: 0 0 16px; color: #fff; font-size: 24px; }
        p { color: #888; line-height: 1.6; margin-bottom: 32px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">⚠️</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>
    `;
}

export default router;
