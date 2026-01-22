import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { BookingNotificationService } from '../services/BookingNotificationService.js';

export const bookingsRouter: Router = Router();

// Get all computers
bookingsRouter.get(
    '/computers',
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const computers = await prisma.computer.findMany({
            where: { isActive: true },
            orderBy: [{ row: 'asc' }, { position: 'asc' }],
        });

        res.json({ success: true, data: computers });
    })
);

// Create a new computer (admin only)
bookingsRouter.post(
    '/computers',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { name, row, position, specs, status, isActive } = req.body;

        if (!name || row === undefined || position === undefined) {
            throw new ApiError('Név, sor és pozíció kötelező', 400, 'MISSING_FIELDS');
        }

        const computer = await prisma.computer.create({
            data: {
                name,
                row,
                position,
                specs: specs || null,
                status: status || null,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        await logSystemActivity('COMPUTER_CREATE', `Computer ${computer.name} created by ${user.username}`, { adminId: user.id, computerId: computer.id });

        res.status(201).json({ success: true, data: computer });
    })
);

// Delete computer (admin only)
bookingsRouter.delete(
    '/computers/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const computerId = req.params.id as string;

        await prisma.$transaction(async (tx) => {
            // Unlink Logs (computerId is optional on Log)
            await tx.log.updateMany({
                where: { computerId },
                data: { computerId: null }
            });

            // Delete Sessions (computerId is required on Session)
            await tx.session.deleteMany({
                where: { computerId }
            });

            // Delete Computer (Cascade will handle Booking and Waitlist)
            await tx.computer.delete({
                where: { id: computerId },
            });
        });

        await logSystemActivity('COMPUTER_DELETE', `Computer ID ${computerId} deleted by ${user.username}`, { adminId: user.id });

        res.json({ success: true, message: 'Computer deleted' });
    })
);

// Seed computers (admin only) - creates 10 computers in 2x5 grid
bookingsRouter.post(
    '/computers/seed',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        // Check if computers already exist
        const existingCount = await prisma.computer.count();
        if (existingCount > 0) {
            throw new ApiError('A számítógépek már létre lettek hozva', 400, 'ALREADY_SEEDED');
        }

        // Create 10 computers in 2x5 grid
        const computers = [];
        for (let row = 0; row < 2; row++) {
            for (let position = 0; position < 5; position++) {
                const computerNumber = row * 5 + position + 1;
                computers.push({
                    name: `PC-${computerNumber}`,
                    row,
                    position,
                });
            }
        }

        await prisma.computer.createMany({ data: computers });

        const createdComputers = await prisma.computer.findMany({
            orderBy: [{ row: 'asc' }, { position: 'asc' }],
        });

        res.status(201).json({ success: true, data: createdComputers });
    })
);

// Get booking schedules (available time slots)
bookingsRouter.get(
    '/schedules',
    asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
        const schedules = await prisma.bookingSchedule.findMany({
            where: { isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startHour: 'asc' }],
        });

        res.json({ success: true, data: schedules });
    })
);

// Create or update booking schedule (admin only)
bookingsRouter.post(
    '/schedules',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { dayOfWeek, startHour, endHour } = req.body;

        if (dayOfWeek === undefined || startHour === undefined || endHour === undefined) {
            throw new ApiError('A nap, kezdőóra és végóra kötelező', 400, 'MISSING_FIELDS');
        }

        if (dayOfWeek < 0 || dayOfWeek > 6) {
            throw new ApiError('A napnak 0 és 6 között kell lennie', 400, 'INVALID_DAY');
        }

        if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
            throw new ApiError('Az óráknak 0 és 23 között kell lenniük', 400, 'INVALID_HOUR');
        }

        if (startHour >= endHour) {
            throw new ApiError('A kezdőórának kisebbnek kell lennie a végóránál', 400, 'INVALID_RANGE');
        }

        const schedule = await prisma.bookingSchedule.create({
            data: { dayOfWeek, startHour, endHour },
        });

        await logSystemActivity('SCHEDULE_CREATE', `Booking schedule created by ${user.username}`, { adminId: user.id });

        res.status(201).json({ success: true, data: schedule });
    })
);

// Delete booking schedule (admin only)
bookingsRouter.delete(
    '/schedules/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        await prisma.bookingSchedule.delete({
            where: { id: req.params.id as string },
        });

        await logSystemActivity('SCHEDULE_DELETE', `Booking schedule ID ${req.params.id} deleted by ${user.username}`, { adminId: user.id });

        res.json({ success: true, message: 'Schedule deleted' });
    })
);

// Get bookings for a specific date
bookingsRouter.get(
    '/date/:date',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const dateStr = req.params.date; // Format: YYYY-MM-DD
        const date = new Date(dateStr as string);

        if (isNaN(date.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum. Használd: ÉÉÉÉ-HH-NN', 400, 'INVALID_DATE');
        }

        // Get start and end of the day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const bookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                computer: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ computerId: 'asc' }, { startTime: 'asc' }],
        });

        res.json({ success: true, data: bookings });
    })
);

// Create a new booking
bookingsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { computerId, date, startTime, endTime } = req.body;

        if (!computerId || !date || !startTime || !endTime) {
            throw new ApiError('Számítógép, dátum, kezdés és befejezés kötelező', 400, 'MISSING_FIELDS');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Validate computer exists
        const computer = await prisma.computer.findUnique({
            where: { id: computerId },
        });

        if (!computer || !computer.isActive) {
            throw new ApiError('A számítógép nem található vagy inaktív', 404, 'COMPUTER_NOT_FOUND');
        }

        // Parse dates
        const bookingDate = new Date(date);
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(bookingDate.getTime()) || isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new ApiError('Érvénytelen dátum/idő formátum', 400, 'INVALID_DATE');
        }

        // Check if start time is in the past (allow 5 minute grace period)
        if (start.getTime() < Date.now() - 300000) {
            throw new ApiError('A foglalás kezdete nem lehet a múltban', 400, 'PAST_DATE');
        }

        // Validate duration
        const duration = end.getTime() - start.getTime();
        if (duration < 1800000) {
            throw new ApiError('A minimális foglalási idő 30 perc', 400, 'DURATION_TOO_SHORT');
        }
        if (duration > 7200000) {
            throw new ApiError('A maximális foglalási idő 2 óra', 400, 'DURATION_TOO_LONG');
        }

        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Check schedule (read-only, can be outside transaction usually, but safer inside if schedules change dynamically)
        const dayOfWeek = bookingDate.getDay();
        const schedule = await prisma.bookingSchedule.findFirst({
            where: {
                dayOfWeek,
                isActive: true,
                startHour: { lte: start.getHours() },
                endHour: { gte: end.getHours() },
            },
        });

        if (!schedule) {
            throw new ApiError('Nincs elérhető foglalási időpont', 400, 'NO_SCHEDULE');
        }

        // EXECUTE TRANSACTION
        const booking = await prisma.$transaction(async (tx) => {
            // 1. Check User Double Booking (User cannot be in two places at once)
            const userOverlap = await tx.booking.findFirst({
                where: {
                    userId: user.id,
                    // Check logic: (StartA < EndB) and (EndA > StartB)
                    startTime: { lt: end },
                    endTime: { gt: start },
                    // Make sure we only check active bookings if we have a cancelled status later, currently deletion handles cancellation
                }
            });

            if (userOverlap) {
                throw new ApiError('Már van foglalásod erre az időpontra egy másik gépen.', 400, 'USER_ALREADY_BOOKED');
            }

            // 2. Advanced Balance Check (Account for ALL future bookings)
            if (!['ADMIN', 'TEACHER'].includes(user.role)) {
                // Get all active future bookings for user (including the one we are about to make effectively)
                // Actually we just query all future bookings from NOW
                const futureBookings = await tx.booking.findMany({
                    where: {
                        userId: user.id,
                        endTime: { gt: new Date() } // All bookings that haven't finished yet
                    }
                });

                // Calculate total "reserved" time
                const futureReservedMs = futureBookings.reduce((sum, b) => {
                    // If booking started in past but ends in future, count remaining? 
                    // Or just count full duration? 
                    // "Logic 1": Count full duration of all strictly future bookings??
                    // Better Logic: Count full duration of pending bookings.
                    // For simplicity and safety: Sum (endTime - startTime) of all found bookings.
                    return sum + (b.endTime.getTime() - b.startTime.getTime());
                }, 0);

                const totalRequiredMs = futureReservedMs + duration;
                const balanceMs = user.timeBalanceSeconds * 1000;

                if (balanceMs < totalRequiredMs) {
                    const requiredMinutes = Math.floor(totalRequiredMs / 60000);
                    const availableMinutes = Math.floor(balanceMs / 60000);
                    throw new ApiError(
                        `Nincs elegendő időegyenleged a jövőbeli foglalásokat is figyelembe véve. Szükséges (összesen): ${requiredMinutes} perc, Egyenleg: ${availableMinutes} perc`,
                        403,
                        'INSUFFICIENT_FUTURE_BALANCE'
                    );
                }

                // 3. Daily Limit Check (2 hours)
                const dailyBookings = await tx.booking.findMany({
                    where: {
                        userId: user.id,
                        date: { gte: startOfDay, lte: endOfDay },
                    },
                });

                const dailyTotalMs = dailyBookings.reduce((sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()), 0);
                const newDailyTotalMs = dailyTotalMs + duration;

                if (newDailyTotalMs > 7200000) {
                    const remainingMs = Math.max(0, 7200000 - dailyTotalMs);
                    const remainingMinutes = Math.floor(remainingMs / 60000);
                    throw new ApiError(
                        `Naponta maximum 2 óra foglalható. Még foglalható: ${remainingMinutes} perc.`,
                        400,
                        'DAILY_LIMIT_EXCEEDED'
                    );
                }
            }

            // 4. Check Computer Availability (Race Condition Protection)
            const computerOverlap = await tx.booking.findFirst({
                where: {
                    computerId,
                    date: { gte: startOfDay, lte: endOfDay },
                    startTime: { lt: end },
                    endTime: { gt: start },
                },
            });

            if (computerOverlap) {
                throw new ApiError('Ez az időpont már foglalt', 400, 'SLOT_TAKEN');
            }

            // 5. Create Booking
            const checkInCode = crypto.randomBytes(16).toString('hex');
            return await tx.booking.create({
                data: {
                    computerId,
                    userId: user.id,
                    date: bookingDate,
                    startTime: start,
                    endTime: end,
                    checkInCode,
                },
                include: {
                    computer: true,
                    user: { select: { id: true, username: true, displayName: true } },
                },
            });
        });

        await logSystemActivity(
            'BOOKING_CREATE',
            `Booking created for ${booking.computer?.name} on ${booking.date.toISOString().split('T')[0]} (${booking.startTime.toISOString().split('T')[1].substring(0, 5)}-${booking.endTime.toISOString().split('T')[1].substring(0, 5)}) by ${user.username}`,
            {
                userId: user.id,
                computerId: computerId,
                metadata: {
                    bookingId: booking.id,
                    date: booking.date,
                    startTime: booking.startTime,
                    endTime: booking.endTime,
                    durationMinutes: (booking.endTime.getTime() - booking.startTime.getTime()) / 60000
                }
            }
        );

        // Send notification
        await BookingNotificationService.createdBooking(booking);

        res.status(201).json({ success: true, data: booking });
    })
);

// Bulk delete bookings (Admin only)
bookingsRouter.post(
    '/bulk-delete',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { bookingIds } = req.body;

        if (!Array.isArray(bookingIds) || bookingIds.length === 0) {
            throw new ApiError('Nincs kiválasztva törlendő foglalás', 400, 'NO_IDS_PROVIDED');
        }

        const deleteResult = await prisma.booking.deleteMany({
            where: {
                id: { in: bookingIds }
            }
        });

        await logSystemActivity(
            'BOOKING_BULK_DELETE',
            `${deleteResult.count} bookings deleted by ${user.username}`,
            {
                adminId: user.id,
                metadata: {
                    count: deleteResult.count,
                    ids: bookingIds
                }
            }
        );

        res.json({ success: true, message: `${deleteResult.count} foglalás törölve`, count: deleteResult.count });
    })
);

// Delete booking (user can delete their own, admin can delete any)
bookingsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id as string },
        });

        if (!booking) {
            throw new ApiError('Foglalás nem található', 404, 'NOT_FOUND');
        }

        // Check permission: user owns booking or is admin/teacher
        if (booking.userId !== user.id && !['ADMIN', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Nincs jogosultsága törölni ezt a foglalást', 403, 'FORBIDDEN');
        }

        await prisma.booking.delete({
            where: { id: req.params.id as string },
        });

        await logSystemActivity(
            'BOOKING_DELETE',
            `Booking for computer ${booking.computerId} on ${booking.date.toISOString().split('T')[0]} cancelled/deleted by ${user.username}`,
            {
                userId: booking.userId,
                adminId: user.id,
                metadata: {
                    bookingId: booking.id,
                    deletedBy: user.username,
                    originalData: {
                        computerId: booking.computerId,
                        date: booking.date,
                        startTime: booking.startTime,
                        endTime: booking.endTime
                    }
                }
            }
        );

        // Check waitlist and notify users
        await BookingNotificationService.checkWaitlist(booking.computerId, booking.startTime, booking.endTime);

        res.json({ success: true, message: 'Booking deleted' });
    })
);

// Check-in by code (Admin only)
bookingsRouter.post(
    '/checkin',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const { checkInCode } = req.body;

        if (!checkInCode) {
            throw new ApiError('Bejelentkezési kód kötelező', 400, 'MISSING_CODE');
        }

        // Find booking by code
        const booking = await prisma.booking.findFirst({
            where: {
                checkInCode,
                checkedInAt: null, // Only not yet checked in
            },
            include: {
                computer: true,
                user: true,
            },
        });

        if (!booking) {
            throw new ApiError('Érvénytelen vagy már felhasznált kód', 404, 'NOT_FOUND');
        }

        // Validate time (can only check in 15 mins before or during booking)
        const now = new Date();
        const start = new Date(booking.startTime);
        const checkInStart = new Date(start.getTime() - 15 * 60000);

        if (now < checkInStart) {
            throw new ApiError('Bejelentkezés még nem lehetséges (15 perccel kezdés előtt)', 400, 'TOO_EARLY');
        }

        if (now > booking.endTime) {
            throw new ApiError('A foglalás lejárt', 400, 'BOOKING_ENDED');
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: { checkedInAt: now },
            include: {
                computer: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
        });

        await logSystemActivity(
            'BOOKING_CHECKIN',
            `User ${updatedBooking.user.username} checked in via code (Admin)`,
            {
                userId: updatedBooking.userId,
                computerId: updatedBooking.computerId,
                adminId: user.id,
                metadata: {
                    bookingId: updatedBooking.id,
                    checkInTime: now,
                    method: 'ADMIN_CODE'
                }
            }
        );

        res.json({ success: true, data: updatedBooking });
    })
);

// Get all bookings with pagination and filtering (Admin/Teacher)
bookingsRouter.get(
    '/admin',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || !['ADMIN', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        const search = (req.query.search as string) || '';
        const includeExpired = req.query.includeExpired === 'true';

        // Build filter
        const where: any = {};

        // Search filter
        if (search) {
            where.OR = [
                { user: { username: { contains: search, mode: 'insensitive' } } },
                { user: { displayName: { contains: search, mode: 'insensitive' } } },
                { computer: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        // Expiration filter
        if (!includeExpired) {
            where.endTime = { gte: new Date() };
        }

        // Execute query
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    computer: true,
                    user: { select: { id: true, username: true, displayName: true } },
                },
                orderBy: { startTime: 'asc' },
                skip,
                take: limit,
            }),
            prisma.booking.count({ where }),
        ]);

        res.json({
            success: true,
            data: bookings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    })
);

bookingsRouter.get(
    '/my',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const bookings = await prisma.booking.findMany({
            where: {
                userId: user.id,
                endTime: { gte: new Date() }, // Active and future bookings
            },
            include: {
                computer: true,
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });

        res.json({ success: true, data: bookings });
    })
);

// Get weekly bookings
bookingsRouter.get(
    '/week/:startDate',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const startDate = new Date(req.params.startDate as string);
        if (isNaN(startDate.getTime())) {
            throw new ApiError('Érvénytelen dátum formátum. Használd: ÉÉÉÉ-HH-NN', 400, 'INVALID_DATE');
        }

        // Get 7 days of bookings starting from startDate
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);

        const bookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            include: {
                computer: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });

        res.json({ success: true, data: bookings });
    })
);

// Update booking (change time/computer)
bookingsRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { computerId, startTime, endTime } = req.body;

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const booking = await prisma.booking.findUnique({
            where: { id: req.params.id as string },
        });

        if (!booking) {
            throw new ApiError('Foglalás nem található', 404, 'NOT_FOUND');
        }

        if (booking.userId !== user.id && !['ADMIN', 'TEACHER'].includes(user.role)) {
            throw new ApiError('Nincs jogosultsága módosítani ezt a foglalást', 403, 'FORBIDDEN');
        }

        const start = startTime ? new Date(startTime) : booking.startTime;
        const end = endTime ? new Date(endTime) : booking.endTime;
        const targetComputerId = computerId || booking.computerId;

        // Check for overlapping bookings (excluding current booking)
        const startOfDay = new Date(booking.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(booking.date);
        endOfDay.setHours(23, 59, 59, 999);

        const overlapping = await prisma.booking.findFirst({
            where: {
                id: { not: booking.id },
                computerId: targetComputerId,
                date: { gte: startOfDay, lte: endOfDay },
                OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
            },
        });

        if (overlapping) {
            throw new ApiError('Ez az időpont már foglalt', 400, 'SLOT_TAKEN');
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: req.params.id as string },
            data: {
                computerId: targetComputerId,
                startTime: start,
                endTime: end,
            },
            include: {
                computer: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
        });

        res.json({ success: true, data: updatedBooking });

        await logSystemActivity(
            'BOOKING_UPDATE',
            `Booking updated by ${user.username}`,
            {
                userId: booking.userId,
                adminId: user.id,
                metadata: {
                    bookingId: booking.id,
                    changes: {
                        computerId: computerId && computerId !== booking.computerId ? `${booking.computerId} -> ${computerId}` : undefined,
                        startTime: startTime && new Date(startTime).getTime() !== booking.startTime.getTime() ? `${booking.startTime.toISOString()} -> ${new Date(startTime).toISOString()}` : undefined,
                        endTime: endTime && new Date(endTime).getTime() !== booking.endTime.getTime() ? `${booking.endTime.toISOString()} -> ${new Date(endTime).toISOString()}` : undefined
                    }
                }
            }
        );
    })
);

// Check-in with QR code
bookingsRouter.post(
    '/:id/checkin',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { checkInCode } = req.body;

        if (!checkInCode) {
            throw new ApiError('Bejelentkezési kód kötelező', 400, 'MISSING_CODE');
        }

        const booking = await prisma.booking.findFirst({
            where: {
                id: req.params.id as string,
                checkInCode,
            },
        });

        if (!booking) {
            throw new ApiError('Érvénytelen bejelentkezési kód', 400, 'INVALID_CODE');
        }

        if (booking.checkedInAt) {
            throw new ApiError('Már bejelentkezve', 400, 'ALREADY_CHECKED_IN');
        }

        // Check if within valid check-in window (30 min before to end of booking)
        const now = new Date();
        const checkInStart = new Date(booking.startTime);
        checkInStart.setMinutes(checkInStart.getMinutes() - 30);

        if (now < checkInStart) {
            throw new ApiError('Bejelentkezés még nem lehetséges', 400, 'TOO_EARLY');
        }

        if (now > booking.endTime) {
            throw new ApiError('A foglalás lejárt', 400, 'BOOKING_ENDED');
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: booking.id },
            data: { checkedInAt: now },
            include: {
                computer: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
        });

        await logSystemActivity(
            'BOOKING_CHECKIN',
            `User ${updatedBooking.user.username} checked in via QR`,
            {
                userId: updatedBooking.userId,
                computerId: updatedBooking.computerId,
                metadata: {
                    bookingId: updatedBooking.id,
                    checkInTime: now,
                    method: 'QR_CODE'
                }
            }
        );

        res.json({ success: true, data: updatedBooking });
    })
);

// Get single computer details
bookingsRouter.get(
    '/computers/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const computer = await prisma.computer.findUnique({
            where: { id: req.params.id as string },
        });

        if (!computer) {
            throw new ApiError('Számítógép nem található', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: computer });
    })
);

// Update computer specs (admin only)
bookingsRouter.patch(
    '/computers/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        console.log('Update computer request:', req.body);
        const { specs, installedGames, status, isActive, name, row, position } = req.body;

        // Check for position conflict
        if (row !== undefined || position !== undefined) {
            const currentComputer = await prisma.computer.findUnique({
                where: { id: req.params.id as string },
                select: { row: true, position: true }
            });

            if (!currentComputer) {
                throw new ApiError('Computer not found', 404, 'NOT_FOUND');
            }

            const targetRow = row !== undefined ? parseInt(row) : currentComputer.row;
            const targetPosition = position !== undefined ? parseInt(position) : currentComputer.position;

            const conflict = await prisma.computer.findFirst({
                where: {
                    row: targetRow,
                    position: targetPosition,
                    id: { not: req.params.id as string }
                }
            });

            if (conflict) {
                throw new ApiError(`A megadott sor/pozíció (${targetRow}/${targetPosition}) már foglalt`, 400, 'POSITION_OCCUPIED');
            }
        }

        const computer = await prisma.computer.update({
            where: { id: req.params.id as string },
            data: {
                ...(name !== undefined && { name }),
                ...(row !== undefined && { row: parseInt(row) }),
                ...(position !== undefined && { position: parseInt(position) }),
                ...(specs !== undefined && { specs }),
                ...(installedGames !== undefined && { installedGames }),
                ...(status !== undefined && { status }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        res.json({ success: true, data: computer });
    })
);

// Add to waitlist
bookingsRouter.post(
    '/waitlist',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { computerId, date, startHour, endHour } = req.body;

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Check if already on waitlist
        const existing = await prisma.waitlist.findFirst({
            where: {
                computerId,
                userId: user.id,
                date: new Date(date),
                startHour,
            },
        });

        if (existing) {
            throw new ApiError('Már rajta vagy a várólistán', 400, 'ALREADY_ON_WAITLIST');
        }

        const waitlistEntry = await prisma.waitlist.create({
            data: {
                computerId,
                userId: user.id,
                date: new Date(date),
                startHour,
                endHour,
            },
            include: {
                computer: true,
            },
        });

        await logSystemActivity('WAITLIST_JOIN', `User ${user.username} joined waitlist for computer ${computerId}`, { userId: user.id, computerId });

        res.status(201).json({ success: true, data: waitlistEntry });
    })
);

// Remove from waitlist
bookingsRouter.delete(
    '/waitlist/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const entry = await prisma.waitlist.findUnique({
            where: { id: req.params.id as string },
        });

        if (!entry) {
            throw new ApiError('Várólista bejegyzés nem található', 404, 'NOT_FOUND');
        }

        if (entry.userId !== user.id && user.role !== 'ADMIN') {
            throw new ApiError('Nincs jogosultsága', 403, 'FORBIDDEN');
        }

        await prisma.waitlist.delete({
            where: { id: req.params.id as string },
        });

        await logSystemActivity('WAITLIST_LEAVE', `User ${user.username} removed from waitlist`, { userId: user.id });

        res.json({ success: true, message: 'Removed from waitlist' });
    })
);

// Get user's waitlist entries
bookingsRouter.get(
    '/waitlist/my',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const entries = await prisma.waitlist.findMany({
            where: {
                userId: user.id,
                date: { gte: new Date() },
            },
            include: {
                computer: true,
            },
            orderBy: [{ date: 'asc' }, { startHour: 'asc' }],
        });

        res.json({ success: true, data: entries });
    })
);

// Admin statistics
bookingsRouter.get(
    '/stats',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        // Get date range (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // Total bookings in the period
        const totalBookings = await prisma.booking.count({
            where: {
                date: { gte: startDate, lte: endDate },
            },
        });

        // Bookings by day of week
        const allBookings = await prisma.booking.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
            },
            select: {
                date: true,
                startTime: true,
            },
        });

        const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0];
        const byHour: Record<number, number> = {};

        allBookings.forEach((b: { date: Date; startTime: Date }) => {
            const day = new Date(b.date).getDay();
            byDayOfWeek[day]++;

            const hour = new Date(b.startTime).getHours();
            byHour[hour] = (byHour[hour] || 0) + 1;
        });

        // Top users
        const topUsers = await prisma.booking.groupBy({
            by: ['userId'],
            where: {
                date: { gte: startDate, lte: endDate },
            },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        // Get user details for top users
        const userIds = topUsers.map((u: { userId: string }) => u.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true, displayName: true },
        });

        type TopUser = { userId: string; _count: { id: number } };
        type UserInfo = { id: string; username: string; displayName: string | null };

        const topUsersWithDetails = topUsers.map((t: TopUser) => ({
            user: users.find((u: UserInfo) => u.id === t.userId),
            count: t._count.id,
        }));

        // Computer utilization
        const computers = await prisma.computer.findMany({
            where: { isActive: true },
        });

        const computerBookings = await prisma.booking.groupBy({
            by: ['computerId'],
            where: {
                date: { gte: startDate, lte: endDate },
            },
            _count: { id: true },
        });

        type ComputerBooking = { computerId: string; _count: { id: number } };
        type ComputerType = { id: string; name: string; row: number; position: number; isActive: boolean };

        const computerUtilization = computers.map((c: ComputerType) => ({
            computer: c,
            bookings: computerBookings.find((b: ComputerBooking) => b.computerId === c.id)?._count.id || 0,
        }));

        res.json({
            success: true,
            data: {
                totalBookings,
                byDayOfWeek,
                byHour,
                topUsers: topUsersWithDetails,
                computerUtilization,
                period: { start: startDate, end: endDate },
            },
        });
    })
);
