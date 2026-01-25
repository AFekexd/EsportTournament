import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { logSystemActivity } from '../services/logService.js';
import { Router, Response } from 'express';
import { discordService } from '../services/discordService.js';

const router = Router();
const SCRIMS_CHANNEL_ID = '1463628186297569363';

// Validation helper
const validateScrimCreate = (body: any) => {
  const { gameId, scheduledAt, durationMinutes, notes, teamId } = body;
  if (!gameId || typeof gameId !== 'string') throw new ApiError('Game ID required', 400, 'INVALID_GAME_ID');
  if (!scheduledAt || isNaN(Date.parse(scheduledAt))) throw new ApiError('Valid scheduled date required', 400, 'INVALID_DATE');
  if (!teamId || typeof teamId !== 'string') throw new ApiError('Team ID required', 400, 'INVALID_TEAM_ID');
  return { 
      gameId, 
      scheduledAt, 
      durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : 60, 
      notes: typeof notes === 'string' ? notes : undefined, 
      teamId 
  };
};

// GET /api/scrims
// List open scrims
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { gameId, date } = req.query;

    const where: any = {
      status: 'OPEN',
      scheduledAt: {
        gte: new Date(), // Only future scrims
      },
    };

    if (gameId) where.gameId = gameId as string;

    if (date) {
        const startOfDay = new Date(date as string);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);
        
        where.scheduledAt = {
            ...where.scheduledAt,
            gte: startOfDay,
            lt: endOfDay
        };
    }

    const scrims = await prisma.scrim.findMany({
      where,
      include: {
        game: { select: { id: true, name: true, imageUrl: true } },
        requesterTeam: {
          select: { id: true, name: true, logoUrl: true, elo: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ success: true, data: scrims });
  })
);

// POST /api/scrims
// Create a new scrim request
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.sub;
    
    // Validate body
    const { gameId, scheduledAt, durationMinutes, notes, teamId } = validateScrimCreate(req.body);

    // Verify user is captain/owner of the team
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new ApiError('Csapat nem található', 404, 'TEAM_NOT_FOUND');
    }

    const internalUser = await prisma.user.findUnique({ where: { keycloakId: userId } });
    
    // Check if team owner or captain
    const member = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: internalUser!.id, teamId } }
    });
    
    if (team.ownerId !== internalUser!.id && member?.role !== 'CAPTAIN') {
        throw new ApiError('Csak csapatkapitány hozhat létre gyakorló meccset', 403, 'FORBIDDEN');
    }

    const scrim = await prisma.scrim.create({
      data: {
        gameId,
        requesterTeamId: teamId,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 60,
        notes,
        status: 'OPEN',
      },
    });

    // Send Discord Notification
    try {
        const createdScrim = await prisma.scrim.findUnique({
            where: { id: scrim.id },
            include: { game: true, requesterTeam: true }
        });

        if (createdScrim) {
            await discordService.sendMessage(
                SCRIMS_CHANNEL_ID,
                {
                    title: `🥊 Új Gyakorló Meccs Kérés!`,
                    description: `A(z) **${createdScrim.requesterTeam.name}** csapat ellenfelet keres!`,
                    color: 0xf59e0b, // Orange
                    fields: [
                        { name: 'Játék', value: createdScrim.game.name, inline: true },
                        { name: 'Időpont', value: new Date(createdScrim.scheduledAt).toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), inline: true },
                        { name: 'Időtartam', value: `${createdScrim.durationMinutes} perc`, inline: true },
                        { name: 'Megjegyzés', value: createdScrim.notes || '-', inline: false },
                        { name: 'Jelentkezés', value: `[Kattints ide](https://esport.pollak.info/scrims)`, inline: false }
                    ],
                    image: createdScrim.game.imageUrl ? { url: createdScrim.game.imageUrl } : undefined
                }
            );
        }
    } catch (error) {
        console.error('Failed to send Discord notification for scrim:', error);
    }

    res.status(201).json({ success: true, data: scrim });
  })
);

// POST /api/scrims/:id/accept
// Accept a scrim request
router.post(
  '/:id/accept',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { teamId } = req.body; // Accepting team ID
    const userId = req.user!.sub;

    if (!teamId) throw new ApiError('Team ID required', 400, 'MISSING_TEAM_ID');

    const scrim = await prisma.scrim.findUnique({
      where: { id: req.params.id },
    });

    if (!scrim) throw new ApiError('Scrim nem található', 404, 'NOT_FOUND');
    if (scrim.status !== 'OPEN') throw new ApiError('Ez a gyakorló meccs már nem elérhető', 400, 'NOT_OPEN');
    if (scrim.requesterTeamId === teamId) throw new ApiError('Saját meccset nem fogadhatsz el', 400, 'SELF_ACCEPT');

    // Verify user permissions for accepting team
    const internalUser = await prisma.user.findUnique({ where: { keycloakId: userId } });
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    
    if (!team) throw new ApiError('Csapat nem található', 404, 'TEAM_NOT_FOUND');
    
    const member = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: internalUser!.id, teamId } }
    });

    if (team.ownerId !== internalUser!.id && member?.role !== 'CAPTAIN') {
        throw new ApiError('Csak csapatkapitány fogadhat el gyakorló meccset', 403, 'FORBIDDEN');
    }

    const updated = await prisma.scrim.update({
      where: { id: scrim.id },
      data: {
        status: 'ACCEPTED',
        opponentTeamId: teamId,
      },
      include: {
          requesterTeam: true,
          opponentTeam: true,
          game: true
      }
    });

    // TODO: Notify requester team via Discord/Email

    res.json({ success: true, data: updated });
  })
);

// DELETE /api/scrims/:id
// Cancel a scrim request
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.sub;
    const scrim = await prisma.scrim.findUnique({
        where: { id: req.params.id },
        include: { requesterTeam: true }
    });

    if (!scrim) throw new ApiError('Scrim nem található', 404, 'NOT_FOUND');

    const internalUser = await prisma.user.findUnique({ where: { keycloakId: userId } });

    // Allow requester owner/captain OR Admin to delete
    let isAllowed = internalUser?.role === 'ADMIN';
    
    if (!isAllowed) {
        if (scrim.requesterTeam.ownerId === internalUser?.id) {
            isAllowed = true;
        } else {
             const member = await prisma.teamMember.findUnique({
                where: { userId_teamId: { userId: internalUser!.id, teamId: scrim.requesterTeamId } }
            });
            if (member?.role === 'CAPTAIN') isAllowed = true;
        }
    }

    if (!isAllowed) {
        throw new ApiError('Nincs jogosultságod törölni ezt a meccset', 403, 'FORBIDDEN');
    }

    await prisma.scrim.delete({ where: { id: req.params.id } });

    res.json({ success: true, message: 'Gyakorló meccs törölve' });
  })
);

export const scrimsRouter: Router = router;
