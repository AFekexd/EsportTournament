import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { logSystemActivity } from '../services/logService.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const supervisorsRouter: Router = Router();

// Helper to get local date string regardless of server time
const toLocalDateStr = (date: Date) => dayjs(date).tz('Europe/Budapest').format('YYYY-MM-DD');

// Get supervisors for a specific date
supervisorsRouter.get(
    '/date/:date',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const dateStr = req.params.date; // Format: YYYY-MM-DD
        const date = new Date(dateStr);

        if (isNaN(date.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum. Használd: ÉÉÉÉ-HH-NN', 400, 'INVALID_DATE');
        }

        const supervisors = await prisma.bookingSupervisor.findMany({
            where: {
                date: {
                    equals: date,
                },
            },
            include: {
                user: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ hour: 'asc' }],
        });

        res.json({ success: true, data: supervisors });
    })
);

// Get weekly supervisors
supervisorsRouter.get(
    '/week/:startDate',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const startDate = new Date(req.params.startDate as string);
        if (isNaN(startDate.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum. Használd: ÉÉÉÉ-HH-NN', 400, 'INVALID_DATE');
        }

        // Get 7 days
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        const supervisors = await prisma.bookingSupervisor.findMany({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: {
                user: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ date: 'asc' }, { hour: 'asc' }],
        });

        res.json({ success: true, data: supervisors });
    })
);

// Assign self as supervisor
supervisorsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { date, hour } = req.body;

        if (!date || hour === undefined) {
            throw new ApiError('Dátum és óra kötelező', 400, 'MISSING_FIELDS');
        }

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum', 400, 'INVALID_DATE');
        }

        if (hour < 0 || hour > 23) {
            throw new ApiError('Az órának 0 és 23 között kell lennie', 400, 'INVALID_HOUR');
        }

        // Allow 5 minutes grace period for past hours today
        const now = dayjs().tz('Europe/Budapest');
        const targetTime = dayjs.tz(`${parsedDate.toISOString().split('T')[0]} ${hour}:00`, 'YYYY-MM-DD HH:mm', 'Europe/Budapest');

        if (targetTime.isBefore(now.subtract(5, 'minute'))) {
            throw new ApiError('Nem vállalhatsz felelősséget a múltban.', 400, 'PAST_DATE');
        }

        const supervisor = await prisma.$transaction(async (tx) => {
            // Check if already assigned
            const existing = await tx.bookingSupervisor.findFirst({
                where: {
                    date: parsedDate,
                    hour
                }
            });

            if (existing) {
                if (existing.userId === user.id) {
                    throw new ApiError('Már te vagy a felelős ebben az órában.', 400, 'ALREADY_SUPERVISOR');
                }
                throw new ApiError('Erre az időpontra már van felelős.', 400, 'SLOT_TAKEN');
            }

            // Optional: User cannot be supervisor if they already have a booking overlapping this hour
            const startOfHour = targetTime.toDate();
            const endOfHour = targetTime.add(1, 'hour').toDate();

            const existingBooking = await tx.booking.findFirst({
                where: {
                    userId: user.id,
                    date: parsedDate,
                    startTime: { lt: endOfHour },
                    endTime: { gt: startOfHour },
                }
            });

            if (existingBooking) {
                throw new ApiError('Nem lehetsz felelős, mert már van gépfoglalásod ebben az órában.', 400, 'HAS_BOOKING');
            }

            return await tx.bookingSupervisor.create({
                data: {
                    date: parsedDate,
                    hour,
                    userId: user.id,
                },
                include: {
                    user: { select: { id: true, username: true, displayName: true } }
                }
            });
        });

        await logSystemActivity(
            'SUPERVISOR_ASSIGNED',
            `User ${user.username} assigned as supervisor for ${parsedDate.toISOString().split('T')[0]} ${hour}:00`,
            { userId: user.id, metadata: { date: parsedDate, hour } }
        );

        res.status(201).json({ success: true, data: supervisor });
    })
);

// Remove self as supervisor
supervisorsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const supervisorId = req.params.id as string;

        const supervisor = await prisma.bookingSupervisor.findUnique({
            where: { id: supervisorId }
        });

        if (!supervisor) {
            throw new ApiError('Felelős bejegyzés nem található', 404, 'NOT_FOUND');
        }

        if (supervisor.userId !== user.id && !['ADMIN', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Nincs jogosultságod törölni ezt a bejegyzést', 403, 'FORBIDDEN');
        }

        // Cannot cancel past shifts unless admin
        const targetTime = dayjs.tz(`${supervisor.date.toISOString().split('T')[0]} ${supervisor.hour}:00`, 'YYYY-MM-DD HH:mm', 'Europe/Budapest');
        if (targetTime.isBefore(dayjs().tz('Europe/Budapest')) && !['ADMIN', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Múltbeli felelősséget nem lehet visszavonni.', 400, 'PAST_DATE');
        }

        await prisma.bookingSupervisor.delete({
            where: { id: supervisorId }
        });

        await logSystemActivity(
            'SUPERVISOR_REMOVED',
            `User ${user.username} removed supervisor assignment ${supervisorId}`,
            { userId: user.id, adminId: supervisor.userId !== user.id ? user.id : undefined }
        );

        res.json({ success: true, message: 'Supervisor assignment removed' });
    })
);
