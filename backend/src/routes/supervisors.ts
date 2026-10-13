import { RequestHandler, Router, Response } from 'express';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { logSystemActivity } from '../services/logService.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { UserRole } from '../utils/enums.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const supervisorsRouter: Router = Router();

// Helper to get local date string regardless of server time
const toLocalDateStr = (date: Date) => dayjs(date).tz('Europe/Budapest').format('YYYY-MM-DD');

// Get all eligible supervisors (Admin, Organizer, Moderator, DOK, Teacher)
supervisorsRouter.get(
    '/eligible',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Jogosultság szükséges', 403, 'FORBIDDEN');
        }

        const eligibleUsers = await prisma.user.findMany({
            where: {
                role: {
                    in: ['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER']
                }
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true
            },
            orderBy: { username: 'asc' }
        });

        res.json({ success: true, data: eligibleUsers });
    })
);

// Get supervisor leaderboard and duty statistics
supervisorsRouter.get(
    '/stats',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Jogosultság szükséges', 403, 'FORBIDDEN');
        }

        const now = dayjs().tz('Europe/Budapest');
        const startOfMonth = now.startOf('month').toDate();
        const endOfMonth = now.endOf('month').toDate();
        const startOfWeek = now.startOf('week').toDate();
        const endOfWeek = now.endOf('week').toDate();

        // Fetch all supervisor assignments
        const allSupervisors = await prisma.bookingSupervisor.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        role: true,
                    }
                }
            },
            orderBy: [{ date: 'desc' }, { hour: 'desc' }]
        });

        // Eligible supervisors list so even those with 0 hours appear
        const eligibleUsers = await prisma.user.findMany({
            where: {
                role: {
                    in: ['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER']
                }
            },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                role: true,
            }
        });

        const userMap = new Map<string, {
            user: {
                id: string;
                username: string;
                displayName: string | null;
                avatarUrl: string | null;
                role: string;
            };
            totalHours: number;
            monthHours: number;
            weekHours: number;
            upcomingHours: number;
            pastHours: number;
            lastShift: { date: Date; hour: number } | null;
        }>();

        eligibleUsers.forEach(u => {
            userMap.set(u.id, {
                user: u,
                totalHours: 0,
                monthHours: 0,
                weekHours: 0,
                upcomingHours: 0,
                pastHours: 0,
                lastShift: null,
            });
        });

        allSupervisors.forEach(shift => {
            if (!userMap.has(shift.userId)) {
                userMap.set(shift.userId, {
                    user: shift.user,
                    totalHours: 0,
                    monthHours: 0,
                    weekHours: 0,
                    upcomingHours: 0,
                    pastHours: 0,
                    lastShift: null,
                });
            }

            const record = userMap.get(shift.userId)!;
            record.totalHours += 1;

            const shiftDate = new Date(shift.date);
            const isThisMonth = shiftDate >= startOfMonth && shiftDate <= endOfMonth;
            const isThisWeek = shiftDate >= startOfWeek && shiftDate <= endOfWeek;

            if (isThisMonth) record.monthHours += 1;
            if (isThisWeek) record.weekHours += 1;

            const shiftDateTime = dayjs.tz(`${shiftDate.toISOString().split('T')[0]} ${shift.hour}:00`, 'YYYY-MM-DD HH:mm', 'Europe/Budapest');
            if (shiftDateTime.isAfter(now)) {
                record.upcomingHours += 1;
            } else {
                record.pastHours += 1;
            }

            if (!record.lastShift || new Date(shift.date) > new Date(record.lastShift.date)) {
                record.lastShift = { date: shift.date, hour: shift.hour };
            }
        });

        const leaderboard = Array.from(userMap.values()).sort((a, b) => b.totalHours - a.totalHours);

        res.json({
            success: true,
            data: {
                leaderboard,
                totalAssignments: allSupervisors.length,
                totalSupervisors: eligibleUsers.length,
                currentMonthTotal: allSupervisors.filter(s => new Date(s.date) >= startOfMonth && new Date(s.date) <= endOfMonth).length,
                currentWeekTotal: allSupervisors.filter(s => new Date(s.date) >= startOfWeek && new Date(s.date) <= endOfWeek).length,
                recentShifts: allSupervisors.slice(0, 15)
            }
        });
    })
);

// Get supervisors within a date range
supervisorsRouter.get(
    '/range',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            throw new ApiError('startDate és endDate paraméter kötelező (YYYY-MM-DD)', 400, 'MISSING_PARAMS');
        }

        const start = new Date(String(startDate));
        const end = new Date(String(endDate));

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum', 400, 'INVALID_DATE');
        }

        const supervisors = await prisma.bookingSupervisor.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end,
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        role: true,
                    }
                }
            },
            orderBy: [{ date: 'asc' }, { hour: 'asc' }]
        });

        res.json({ success: true, data: supervisors });
    })
);

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

        const { date, hour, targetUserId } = req.body;

        if (!date || hour === undefined) {
            throw new ApiError('Dátum és óra kötelező', 400, 'MISSING_FIELDS');
        }

        let actualUserId = user.id;

        // If assigning self, check if user has eligible supervisor role
        if (!targetUserId || targetUserId === user.id) {
            if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(user.role)) {
                throw new ApiError('Nem rendelkezel felügyelői jogosultsággal.', 403, 'FORBIDDEN');
            }
        }

        // If targetUserId is provided, check admin perms
        if (targetUserId && targetUserId !== user.id) {
            if (user.role !== 'ADMIN') {
                throw new ApiError('Csak adminisztrátor jelölhet ki másik felelőst.', 403, 'FORBIDDEN');
            }

            // Verify target user exists and has correct role
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId }
            });

            if (!targetUser) {
                throw new ApiError('A kijelölt felhasználó nem található.', 404, 'NOT_FOUND');
            }

            if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(targetUser.role)) {
                throw new ApiError('A kijelölt felhasználó nem rendelkezik ügyeleti jogosultsággal.', 400, 'INVALID_ROLE');
            }

            actualUserId = targetUser.id;
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
                if (existing.userId === actualUserId) {
                    throw new ApiError(actualUserId === user.id ? 'Már te vagy a felelős ebben az órában.' : 'A felhasználó már be van osztva erre az órára.', 400, 'ALREADY_SUPERVISOR');
                }
                throw new ApiError('Erre az időpontra már van felelős.', 400, 'SLOT_TAKEN');
            }

            // Optional: User cannot be supervisor if they already have a booking overlapping this hour
            const startOfHour = targetTime.toDate();
            const endOfHour = targetTime.add(1, 'hour').toDate();

            const existingBooking = await tx.booking.findFirst({
                where: {
                    userId: actualUserId,
                    date: parsedDate,
                    startTime: { lt: endOfHour },
                    endTime: { gt: startOfHour },
                }
            });

            if (existingBooking) {
                throw new ApiError(actualUserId === user.id ? 'Nem lehetsz felelős, mert már van gépfoglalásod ebben az órában.' : 'A kiválasztott felhasználó nem lehet felelős, mert gépfoglalása van.', 400, 'HAS_BOOKING');
            }

            return await tx.bookingSupervisor.create({
                data: {
                    date: parsedDate,
                    hour,
                    userId: actualUserId,
                },
                include: {
                    user: { select: { id: true, username: true, displayName: true } }
                }
            });
        });

        await logSystemActivity(
            'SUPERVISOR_ASSIGNED',
            `User ${actualUserId === user.id ? user.username : 'target assigned'} as supervisor for ${parsedDate.toISOString().split('T')[0]} ${hour}:00`,
            { userId: user.id, metadata: { date: parsedDate, hour, targetUserId: actualUserId } }
        );

        res.status(201).json({ success: true, data: supervisor });
    })
);

// Bulk assign supervisor shifts (e.g., weekly or multi-hour shifts)
supervisorsRouter.post(
    '/bulk',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { dates, date, hours, startHour, endHour, targetUserId } = req.body;

        let dateList: string[] = [];
        if (Array.isArray(dates) && dates.length > 0) {
            dateList = dates;
        } else if (date) {
            dateList = [date];
        } else {
            throw new ApiError('Legalább egy dátum megadása kötelező', 400, 'MISSING_DATE');
        }

        let hourList: number[] = [];
        if (Array.isArray(hours) && hours.length > 0) {
            hourList = hours;
        } else if (typeof startHour === 'number' && typeof endHour === 'number') {
            for (let h = startHour; h <= endHour; h++) {
                hourList.push(h);
            }
        } else {
            throw new ApiError('Órák megadása kötelező (hours lista vagy startHour & endHour)', 400, 'MISSING_HOURS');
        }

        // Validate hours
        for (const h of hourList) {
            if (h < 0 || h > 23) {
                throw new ApiError('Minden órának 0 és 23 között kell lennie', 400, 'INVALID_HOUR');
            }
        }

        let actualUserId = user.id;
        if (!targetUserId || targetUserId === user.id) {
            if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(user.role)) {
                throw new ApiError('Nem rendelkezel felügyelői jogosultsággal.', 403, 'FORBIDDEN');
            }
        } else {
            if (!['ADMIN', 'TEACHER'].includes(user.role)) {
                throw new ApiError('Csak adminisztrátor vagy tanár jelölhet ki más felhasználót.', 403, 'FORBIDDEN');
            }
            const targetUser = await prisma.user.findUnique({
                where: { id: targetUserId },
            });
            if (!targetUser) {
                throw new ApiError('A kijelölt felhasználó nem található.', 404, 'NOT_FOUND');
            }
            if (!['ADMIN', 'ORGANIZER', 'MODERATOR', 'DOK', 'TEACHER'].includes(targetUser.role)) {
                throw new ApiError('A kijelölt felhasználó nem rendelkezik ügyeleti jogosultsággal.', 400, 'INVALID_ROLE');
            }
            actualUserId = targetUser.id;
        }

        const now = dayjs().tz('Europe/Budapest');
        const created: any[] = [];
        const conflicts: { date: string; hour: number; reason: string }[] = [];

        for (const dStr of dateList) {
            const parsedDate = new Date(dStr);
            if (isNaN(parsedDate.getTime())) {
                conflicts.push({ date: dStr, hour: -1, reason: 'Érvénytelen dátum formátum' });
                continue;
            }

            const normalizedDateStr = dayjs(dStr).format('YYYY-MM-DD');

            for (const hour of hourList) {
                const targetTime = dayjs.tz(`${normalizedDateStr} ${hour}:00`, 'YYYY-MM-DD HH:mm', 'Europe/Budapest');
                if (targetTime.isBefore(now.subtract(5, 'minute'))) {
                    conflicts.push({ date: normalizedDateStr, hour, reason: 'Múltbeli időpont' });
                    continue;
                }

                // Check existing
                const existing = await prisma.bookingSupervisor.findFirst({
                    where: { date: parsedDate, hour },
                    include: { user: { select: { displayName: true, username: true } } }
                });

                if (existing) {
                    if (existing.userId === actualUserId) {
                        conflicts.push({ date: normalizedDateStr, hour, reason: 'Már be van osztva erre az órára' });
                    } else {
                        conflicts.push({ date: normalizedDateStr, hour, reason: `Foglalt (${existing.user.displayName || existing.user.username})` });
                    }
                    continue;
                }

                // Check booking conflict
                const startOfHour = targetTime.toDate();
                const endOfHour = targetTime.add(1, 'hour').toDate();
                const existingBooking = await prisma.booking.findFirst({
                    where: {
                        userId: actualUserId,
                        date: parsedDate,
                        startTime: { lt: endOfHour },
                        endTime: { gt: startOfHour },
                    }
                });

                if (existingBooking) {
                    conflicts.push({ date: normalizedDateStr, hour, reason: 'Ütköző gépfoglalás van ebben az órában' });
                    continue;
                }

                try {
                    const newShift = await prisma.bookingSupervisor.create({
                        data: {
                            date: parsedDate,
                            hour,
                            userId: actualUserId,
                        },
                        include: {
                            user: { select: { id: true, username: true, displayName: true, role: true } }
                        }
                    });
                    created.push(newShift);
                } catch (err: any) {
                    conflicts.push({ date: normalizedDateStr, hour, reason: 'Mentési hiba vagy párhuzamos foglalás' });
                }
            }
        }

        if (created.length > 0) {
            await logSystemActivity(
                'SUPERVISOR_BULK_ASSIGNED',
                `User ${actualUserId === user.id ? user.username : 'target'} assigned ${created.length} supervisor shifts`,
                { userId: user.id, metadata: { count: created.length, targetUserId: actualUserId } }
            );
        }

        res.status(201).json({
            success: true,
            createdCount: created.length,
            conflicts,
            data: created
        });
    })
);

// Bulk remove supervisor assignments
supervisorsRouter.delete(
    '/bulk',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new ApiError('A törlendő azonosítók listája kötelező (ids)', 400, 'MISSING_IDS');
        }

        const supervisors = await prisma.bookingSupervisor.findMany({
            where: { id: { in: ids } },
        });

        if (supervisors.length === 0) {
            return res.json({ success: true, deletedCount: 0 });
        }

        const isPrivileged = ['ADMIN', 'TEACHER'].includes(user.role);
        const now = dayjs().tz('Europe/Budapest');

        const allowedIds: string[] = [];
        for (const s of supervisors) {
            if (s.userId !== user.id && !isPrivileged) {
                continue;
            }
            const sDateStr = dayjs(s.date).format('YYYY-MM-DD');
            const targetTime = dayjs.tz(`${sDateStr} ${s.hour}:00`, 'YYYY-MM-DD HH:mm', 'Europe/Budapest');
            if (targetTime.isBefore(now) && !isPrivileged) {
                continue;
            }
            allowedIds.push(s.id);
        }

        if (allowedIds.length === 0) {
            throw new ApiError('Nincs jogosultságod a kiválasztott beosztások törléséhez', 403, 'FORBIDDEN');
        }

        const result = await prisma.bookingSupervisor.deleteMany({
            where: { id: { in: allowedIds } },
        });

        await logSystemActivity(
            'SUPERVISOR_BULK_REMOVED',
            `User ${user.username} bulk removed ${result.count} supervisor assignments`,
            { userId: user.id, metadata: { deletedCount: result.count } }
        );

        res.json({ success: true, deletedCount: result.count });
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
