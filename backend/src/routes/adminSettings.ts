
import { Router, Request, Response } from 'express'; // Import Requesttype explicitly to fix implicit any
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

export const adminSettingsRouter: Router = Router();

// Get Incident Handler Setting
adminSettingsRouter.get('/incident-handler', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const keycloakId = req.user?.sub;
        if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });
        
        const user = await prisma.user.findUnique({ where: { keycloakId } });
        if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'incident_primary_handler_id' }
        });
        
        let handlerUser = null;
        if (setting?.value) {
            handlerUser = await prisma.user.findUnique({
                where: { id: setting.value },
                select: { id: true, username: true, displayName: true, avatarUrl: true }
            });
        }
        
        res.json({ handlerId: setting?.value || null, handlerUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set Incident Handler Setting
adminSettingsRouter.post('/incident-handler', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const keycloakId = req.user?.sub;
        const { userId } = req.body; // userId of the handler, or null to reset
        
        if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });
        
        const user = await prisma.user.findUnique({ where: { keycloakId } });
        if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });

        if (userId) {
            // Verify user exists and is admin (optional, maybe just exists)
            const handler = await prisma.user.findUnique({ where: { id: userId } });
            if (!handler) return res.status(404).json({ error: 'Handler user not found' });
            
            await prisma.systemSetting.upsert({
                where: { key: 'incident_primary_handler_id' },
                update: { value: userId },
                create: { 
                    key: 'incident_primary_handler_id', 
                    value: userId,
                    description: 'User ID of the primary incident handler (exclusive notifications)'
                }
            });
        } else {
            // Remove setting (Reset to default broadcast)
            try {
                await prisma.systemSetting.delete({
                    where: { key: 'incident_primary_handler_id' }
                });
            } catch (e) {
                // Ignore if not found
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
