
import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

export const IncidentController = {
  create: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, description, computerId, priority } = req.body;
      // We need to resolve User ID from Keycloak ID or use what's in req.user if it's the internal ID.
      // Based on `steamController.ts`: `const keycloakId = (req as AuthenticatedRequest).user?.sub;` then finds user.
      // Most routes in this project seem to do `prisma.user.findUnique({ where: { keycloakId } })`.
      
      // Let's assume we have `req.user.sub` (Keycloak ID) or `req.user.id` if middleware was enhanced.
      // I'll check `backend/src/middleware/auth.ts` to be sure, but standard is Keycloak ID in `sub`.
      
      const keycloakId = req.user?.sub;
      if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });
      
      const user = await prisma.user.findUnique({ where: { keycloakId } });
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      const incident = await prisma.incident.create({
        data: {
          title,
          description,
          reporterId: user.id,
          computerId: computerId || null,
          priority: priority || 'MEDIUM',
          status: 'OPEN'
        }
      });
      
      // Notification Logic
      // 1. Check preference
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'incident_primary_handler_id' }
      });
      
      const primaryHandlerId = setting?.value;
      
      if (primaryHandlerId) {
        // Notify specific handler
        await notificationService.createNotification({
            userId: primaryHandlerId,
            type: 'SYSTEM',
            title: `Új incidens: ${title}`,
            message: `Jelentő: ${user.username || user.displayName}. Kötődő gép: ${computerId ? 'Van' : 'Nincs'}`,
            link: `/admin/incidents`,
            sendEmail: true,
            sendDiscord: true
        });
      } else {
        // Notify ALL admins
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true }
        });
        
        await Promise.all(admins.map(admin => 
           notificationService.createNotification({
            userId: admin.id,
            type: 'SYSTEM',
            title: `Új incidens: ${title}`,
            message: `Jelentő: ${user.username || user.displayName}`,
            link: `/admin/incidents`,
            sendEmail: true,
            sendDiscord: true
           })
        ));
      }
      
      res.json(incident);
    } catch (error) {
      console.error('Error creating incident:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getAll: async (req: AuthenticatedRequest, res: Response) => {
     try {
       // Check if admin
       const keycloakId = req.user?.sub;
       if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });

       const user = await prisma.user.findUnique({ where: { keycloakId } });
       if (!user || user.role !== 'ADMIN') {
         // Allow STAFF/ORGANIZER? Spec said "Admins".
         return res.status(403).json({ error: 'Forbidden' });
       }

       const incidents = await prisma.incident.findMany({
         include: {
            reporter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            computer: { select: { id: true, name: true, hostname: true } }
         },
         orderBy: { createdAt: 'desc' }
       });
       
       res.json(incidents);
     } catch (error) {
       console.error(error);
       res.status(500).json({ error: 'Internal server error' });
     }
  },

  getMy: async (req: AuthenticatedRequest, res: Response) => {
    try {
        const keycloakId = req.user?.sub;
        if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({ where: { keycloakId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const incidents = await prisma.incident.findMany({
            where: { reporterId: user.id },
            include: {
                computer: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(incidents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { status, resolutionNote, priority } = req.body;
        
        const keycloakId = req.user?.sub;
        if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({ where: { keycloakId } });
        if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
        
        const incident = await prisma.incident.update({
            where: { id },
            data: {
                status,
                resolutionNote,
                priority,
                resolvedBy: status === 'RESOLVED' || status === 'CLOSED' ? user.id : undefined,
                resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined
            }
        });
        
        // Notify reporter about update
        if (status === 'RESOLVED' || status === 'CLOSED' || status === 'IN_PROGRESS') {
             await notificationService.createNotification({
                userId: incident.reporterId,
                type: 'SYSTEM',
                title: `Incidens frissítés: ${incident.title}`,
                message: `Státusz: ${status}. ${resolutionNote ? `Megjegyzés: ${resolutionNote}` : ''}`,
                link: `/bug-report`,
                sendEmail: true
             });
        }
        
        res.json(incident);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
  },
  
  delete: async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { id } = req.params;
        const keycloakId = req.user?.sub;
         if (!keycloakId) return res.status(401).json({ error: 'Unauthorized' });

        const user = await prisma.user.findUnique({ where: { keycloakId } });
        if (!user || user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
        
        await prisma.incident.delete({ where: { id } });
        res.json({ success: true });
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Internal server error' });
      }
  }
};
