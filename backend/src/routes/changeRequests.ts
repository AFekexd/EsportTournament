
import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { logSystemActivity } from '../services/logService.js';
import { UserRole } from '../utils/enums.js';
import { notificationService } from '../services/notificationService.js';
import { calculateDiff } from '../utils/diffUtils.js';

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

        // Parse status from query, default to PENDING if not specified
        // Allow comma-separated values e.g. "PENDING,APPROVED"
        const statusParam = req.query.status as string;
        let statusFilter: any = 'PENDING';
        
        if (statusParam) {
            const statuses = statusParam.split(',').map(s => s.trim().toUpperCase());
            // If explicit status provided, use "in" filter
            statusFilter = { in: statuses };
        }

        const requests = await prisma.changeRequest.findMany({
            where: { status: statusFilter },
            include: {
                requester: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true
                        // avatarUrl removed to reduce payload size
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Enhance requests with entity names and current data for comparison
        const enrichedRequests = await Promise.all(requests.map(async (req: any) => {
            let entityName = 'Ismeretlen';
            let currentData: any = {};

            if (req.type === 'USER_PROFILE') {
                const u = await prisma.user.findUnique({
                    where: { id: req.entityId },
                    select: {
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        steamId: true,
                        emailNotifications: true
                    }
                });
                entityName = u?.username || 'Ismeretlen Felhasználó';

                if (u && req.data) {
                    // Extract only the fields that are being changed
                    Object.keys(req.data).forEach(key => {
                        if (key in u) {
                            currentData[key] = (u as any)[key];
                        }
                    });
                }
            } else if (req.type === 'TEAM_PROFILE') {
                const t = await prisma.team.findUnique({
                    where: { id: req.entityId },
                    select: {
                        name: true,
                        description: true,
                        logoUrl: true,
                        coverUrl: true
                    }
                });
                entityName = t?.name || 'Ismeretlen Csapat';

                if (t && req.data) {
                    // Extract only the fields that are being changed
                    Object.keys(req.data).forEach(key => {
                        if (key in t) {
                            currentData[key] = (t as any)[key];
                        }
                    });
                }
            }

            return {
                ...req,
                entityName,
                currentData
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

// Get User's own requests (All statuses)
changeRequestsRouter.get(
    '/my-requests',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ 
            where: { keycloakId: req.user!.sub },
            select: { id: true }
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const myRequests = await prisma.changeRequest.findMany({
            where: { requesterId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: myRequests });
    })
);

// Helper to approve a single request
async function approveRequestInternal(requestId: string, admin: any, note?: string) {
    const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });

    if (!request) {
        throw new Error(`Request ${requestId} not found`);
    }

    if (request.status !== 'PENDING') {
        return; // Skip if already processed
    }

    const data = request.data as any;
    let changes: any = {};

    if (request.type === 'USER_PROFILE') {
        const currentUser = await prisma.user.findUnique({ where: { id: request.entityId } });
        changes = calculateDiff(currentUser, data);

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
            { 
                adminId: admin.id, 
                userId: request.entityId,
                metadata: {
                    changes: Object.keys(changes).length > 0 ? changes : data,
                    adminNote: note
                }
            }
        );

        // Notify User
        await notificationService.createNotification({
            userId: request.entityId,
            type: 'SYSTEM',
            title: 'Profil módosítás elfogadva',
            message: `Az adminisztrátor jóváhagyta a profil módosítási kérelmedet.`,
            link: '/settings'
        });

        // Web-Discord Sync
        const { webSyncService } = await import('../services/webSyncService.js');
        await webSyncService.onUserUpdate(request.entityId);

    } else if (request.type === 'TEAM_PROFILE') {
        const currentTeam = await prisma.team.findUnique({ where: { id: request.entityId } });
        changes = calculateDiff(currentTeam, data);

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
            { 
                adminId: admin.id, 
                metadata: { 
                    teamId: request.entityId,
                    changes: Object.keys(changes).length > 0 ? changes : data,
                    adminNote: note
                } 
            }
        );

        // Notify User
        await notificationService.createNotification({
            userId: request.requesterId,
            type: 'SYSTEM',
            title: 'Csapat módosítás elfogadva',
            message: `A csapat profil módosítási kérelmet elfogadták.`,
            link: `/teams/${request.entityId}`
        });
    }

    return prisma.changeRequest.update({
        where: { id: request.id },
        data: { 
            status: 'APPROVED',
            processedById: admin.id,
            processedAt: new Date(),
            adminNote: note
        }
    });
}

// Bulk Approve
changeRequestsRouter.post(
    '/bulk-approve',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const admin = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!admin || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(admin.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod a művelethez', 403, 'FORBIDDEN');
        }

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new ApiError('Nincs kiválasztva elem', 400, 'NO_SELECTION');
        }

        let successCount = 0;
        const errors = [];

        for (const id of ids) {
            try {
                await approveRequestInternal(id, admin);
                successCount++;
            } catch (error: any) {
                console.error(`Failed to approve request ${id}`, error);
                errors.push({ id, error: error.message });
            }
        }

        res.json({ success: true, data: { successCount, errors } });
    })
);

// Bulk Reject
changeRequestsRouter.post(
    '/bulk-reject',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const admin = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!admin || ![UserRole.ADMIN, UserRole.ORGANIZER, UserRole.MODERATOR].includes(admin.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod a művelethez', 403, 'FORBIDDEN');
        }

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new ApiError('Nincs kiválasztva elem', 400, 'NO_SELECTION');
        }

        const result = await prisma.changeRequest.updateMany({
            where: {
                id: { in: ids },
                status: 'PENDING'
            },
            data: { status: 'REJECTED' }
        });

        await logSystemActivity(
            'BULK_REJECT',
            `${result.count} requests rejected by ${admin.username}`,
            { adminId: admin.id, metadata: { count: result.count, ids } }
        );

        res.json({ success: true, data: { count: result.count } });
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

        try {
            const { note } = req.body;
            const updatedRequest = await approveRequestInternal(req.params.id, admin, note);
            if (!updatedRequest) {
                throw new ApiError('A kérelem már feldolgozásra került', 400, 'ALREADY_PROCESSED');
            }
            res.json({ success: true, data: updatedRequest });
        } catch (error: any) {
            if (error.message.includes('not found')) {
                throw new ApiError('A kérelem nem található', 404, 'NOT_FOUND');
            }
            throw error;
        }
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

        const { reason } = req.body;
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
             throw new ApiError('Indoklás megadása kötelező az elutasításhoz', 400, 'REASON_REQUIRED');
        }

        // Calculate diff for logging purposes (what would have changed)
        let changes: any = {};
        if (request.type === 'USER_PROFILE') {
            const currentUser = await prisma.user.findUnique({ where: { id: request.entityId } });
            changes = calculateDiff(currentUser, request.data);
        } else if (request.type === 'TEAM_PROFILE') {
            const currentTeam = await prisma.team.findUnique({ where: { id: request.entityId } });
            changes = calculateDiff(currentTeam, request.data);
        }

        const updatedRequest = await prisma.changeRequest.update({
            where: { id: request.id },
            data: { 
                status: 'REJECTED',
                rejectionReason: reason,
                processedById: admin.id,
                processedAt: new Date()
            }
        });

        await logSystemActivity(
            'REQUEST_REJECTED',
            `Request rejected by ${admin.username}`,
            { 
                adminId: admin.id, 
                metadata: { 
                    requestId: request.id, 
                    type: request.type, 
                    reason,
                    changes: Object.keys(changes).length > 0 ? changes : request.data,
                    originalData: request.data // Also keep raw data just in case
                } 
            }
        );

        await notificationService.createNotification({
            userId: request.requesterId,
            type: 'SYSTEM',
            title: 'Módosítási kérelem elutasítva',
            message: `A profil/csapat módosítási kérelmedet elutasították. Indoklás: ${reason}`,
            link: '/settings'
        });

        res.json({ success: true, data: updatedRequest });
    })
);
