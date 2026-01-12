
import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logSystemActivity } from '../services/logService.js';
import { UserRole } from '../utils/enums.js';

export const changeRequestsRouter: Router = Router();

// Get all pending requests (Admin/Organizer/Moderator only)
changeRequestsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(user.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod a kérelmek megtekintéséhez', 403, 'FORBIDDEN');
        }

        const requests = await prisma.changeRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                requester: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enhance requests with entity names
        const enrichedRequests = await Promise.all(requests.map(async (req: any) => {
            let entityName = 'Ismeretlen';
            if (req.type === 'USER_PROFILE') {
                const u = await prisma.user.findUnique({ where: { id: req.entityId }, select: { username: true } });
                entityName = u?.username || 'Ismeretlen Felhasználó';
            } else if (req.type === 'TEAM_PROFILE') {
                const t = await prisma.team.findUnique({ where: { id: req.entityId }, select: { name: true } });
                entityName = t?.name || 'Ismeretlen Csapat';
            }

            return {
                ...req,
                entityName
            };
        }));

        res.json({ success: true, data: enrichedRequests });
    })
);

// Get stats (pending count)
changeRequestsRouter.get(
    '/stats',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(user.role as UserRole)) {
            return res.json({ success: true, data: { pendingCount: 0 } });
        }

        const count = await prisma.changeRequest.count({
            where: { status: 'PENDING' }
        });

        res.json({ success: true, data: { pendingCount: count } });
    })
);

// Approve request
changeRequestsRouter.post(
    '/:id/approve',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const admin = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!admin || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(admin.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod a kérelem jóváhagyásához', 403, 'FORBIDDEN');
        }

        const request = await prisma.changeRequest.findUnique({ where: { id: req.params.id as string } });

        if (!request) {
            throw new ApiError('A kérelem nem található', 404, 'NOT_FOUND');
        }

        if (request.status !== 'PENDING') {
            throw new ApiError('Ez a kérelem már feldolgozásra került', 400, 'ALREADY_PROCESSED');
        }

        const data = request.data as any;

        // Apply changes based on type
        if (request.type === 'USER_PROFILE') {
            await prisma.user.update({
                where: { id: request.entityId },
                data: {
                    ...(data.displayName !== undefined && { displayName: data.displayName }),
                    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
                    ...(data.steamId !== undefined && { steamId: data.steamId }),
                    ...(data.emailNotifications !== undefined && { emailNotifications: data.emailNotifications })
                }
            });
            await logSystemActivity(
                'USER_UPDATE_APPROVED',
                `User update approved by ${admin.username}`,
                { adminId: admin.id, userId: request.entityId }
            );

        } else if (request.type === 'TEAM_PROFILE') {
            await prisma.team.update({
                where: { id: request.entityId },
                data: {
                    ...(data.name && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
                    ...(data.coverUrl !== undefined && { coverUrl: data.coverUrl })
                }
            });
            await logSystemActivity(
                'TEAM_UPDATE_APPROVED',
                `Team update approved by ${admin.username}`,
                { adminId: admin.id, metadata: { teamId: request.entityId } }
            );
        }

        // Mark request as approved
        const updatedRequest = await prisma.changeRequest.update({
            where: { id: request.id },
            data: { status: 'APPROVED' }
        });

        res.json({ success: true, data: updatedRequest });
    })
);

// Reject request
changeRequestsRouter.post(
    '/:id/reject',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const admin = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!admin || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(admin.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod a kérelem elutasításához', 403, 'FORBIDDEN');
        }

        const request = await prisma.changeRequest.findUnique({ where: { id: req.params.id as string } });

        if (!request) {
            throw new ApiError('A kérelem nem található', 404, 'NOT_FOUND');
        }

        if (request.status !== 'PENDING') {
            throw new ApiError('Ez a kérelem már feldolgozásra került', 400, 'ALREADY_PROCESSED');
        }

        const updatedRequest = await prisma.changeRequest.update({
            where: { id: request.id },
            data: { status: 'REJECTED' }
        });

        await logSystemActivity(
            'REQUEST_REJECTED',
            `Request rejected by ${admin.username}`,
            { adminId: admin.id, metadata: { requestId: request.id, type: request.type } }
        );

        res.json({ success: true, data: updatedRequest });
    })
);
