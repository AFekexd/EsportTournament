import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { UserRole } from '../utils/enums.js';

export const bugReportsRouter: Router = Router();

// Create a new bug report
bugReportsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { title, description, category, priority, imageUrl } = req.body;

        if (!title || !description || !category) {
            throw new ApiError('Cím, leírás és kategória megadása kötelező', 400, 'INVALID_INPUT');
        }

        const validCategories = ['WEBSITE', 'TOURNAMENT', 'BOOKING', 'TEAM', 'OTHER'];
        if (!validCategories.includes(category)) {
            throw new ApiError('Érvénytelen kategória', 400, 'INVALID_CATEGORY');
        }

        const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
        if (priority && !validPriorities.includes(priority)) {
            throw new ApiError('Érvénytelen prioritás', 400, 'INVALID_PRIORITY');
        }

        const bugReport = await prisma.bugReport.create({
            data: {
                title,
                description,
                category,
                priority: priority || 'MEDIUM',
                imageUrl,
                reporterId: user.id
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.status(201).json({ success: true, data: bugReport });
    })
);

// Get bug reports (own for users, all for admins)
bugReportsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);
        const { status, category } = req.query;

        const where: any = {};

        // Non-admins can only see their own reports
        if (!isAdmin) {
            where.reporterId = user.id;
        }

        // Filter by status if provided
        if (status && typeof status === 'string') {
            where.status = status;
        }

        // Filter by category if provided
        if (category && typeof category === 'string') {
            where.category = category;
        }

        const bugReports = await prisma.bugReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json({ success: true, data: bugReports });
    })
);

// Get a single bug report
bugReportsRouter.get(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const bugReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!bugReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        // Non-admins can only see their own reports
        if (!isAdmin && bugReport.reporterId !== user.id) {
            throw new ApiError('Nincs jogosultságod megtekinteni ezt a hibajelentést', 403, 'FORBIDDEN');
        }

        res.json({ success: true, data: bugReport });
    })
);

// Update bug report (admin only: status, adminNote)
bugReportsRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        if (!isAdmin) {
            throw new ApiError('Nincs jogosultságod módosítani a hibajelentést', 403, 'FORBIDDEN');
        }

        const { status, adminNote, priority, createChangelog, changelogDescription } = req.body;

        const existingReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id }
        });

        if (!existingReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        const updateData: any = {};

        if (status) {
            const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
            if (!validStatuses.includes(status)) {
                throw new ApiError('Érvénytelen státusz', 400, 'INVALID_STATUS');
            }
            updateData.status = status;

            // Set resolvedAt when status changes to RESOLVED
            if (status === 'RESOLVED' && existingReport.status !== 'RESOLVED') {
                updateData.resolvedAt = new Date();

                // Create changelog entry if requested
                if (createChangelog) {
                    const changeDescription = changelogDescription || `🐛 ${existingReport.title}`;

                    // Get latest changelog version
                    const latestLog = await prisma.changelog.findFirst({
                        orderBy: { createdAt: 'desc' }
                    });

                    let newVersion = '1.0.0';
                    if (latestLog) {
                        // Simple PATCH increment
                        const parts = latestLog.version.split('.').map(Number);
                        parts[2] = parts[2] + 1;
                        newVersion = parts.join('.');
                    }

                    await prisma.changelog.create({
                        data: {
                            version: newVersion,
                            type: 'PATCH',
                            changes: [changeDescription],
                            authorId: user.id
                        }
                    });
                }
            }
        }

        if (adminNote !== undefined) {
            updateData.adminNote = adminNote;
        }

        if (priority) {
            const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
            if (!validPriorities.includes(priority)) {
                throw new ApiError('Érvénytelen prioritás', 400, 'INVALID_PRIORITY');
            }
            updateData.priority = priority;
        }

        const bugReport = await prisma.bugReport.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json({ success: true, data: bugReport });
    })
);

// Delete bug report (admin only)
bugReportsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        if (!isAdmin) {
            throw new ApiError('Nincs jogosultságod törölni a hibajelentést', 403, 'FORBIDDEN');
        }

        const existingReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id }
        });

        if (!existingReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        await prisma.bugReport.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: 'Hibajelentés sikeresen törölve' });
    })
);
