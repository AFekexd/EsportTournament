import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { BookingNotificationService } from '../services/BookingNotificationService.js';

export const bookingsRouter = Router();

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

        await prisma.computer.delete({
            where: { id: req.params.id },
        });

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
            where: { id: req.params.id },
        });

        res.json({ success: true, message: 'Schedule deleted' });
    })
);

// Get bookings for a specific date
bookingsRouter.get(
    '/date/:date',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const dateStr = req.params.date; // Format: YYYY-MM-DD
        const date = new Date(dateStr);

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

        // Validate duration (max 2 hours = 7200000 ms, min 30 min = 1800000 ms)
        const duration = end.getTime() - start.getTime();
        if (duration < 1800000) {
            throw new ApiError('A minimális foglalási idő 30 perc', 400, 'DURATION_TOO_SHORT');
        }
        if (duration > 7200000) {
            throw new ApiError('A maximális foglalási idő 2 óra', 400, 'DURATION_TOO_LONG');
        }

        // Check if the booking date matches the day of week with an active schedule
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

        // Check for overlapping bookings
        const startOfDay = new Date(bookingDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(bookingDate);
        endOfDay.setHours(23, 59, 59, 999);

        const overlapping = await prisma.booking.findFirst({
            where: {
                computerId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                OR: [
                    {
                        startTime: { lt: end },
                        endTime: { gt: start },
                    },
                ],
            },
        });

        if (overlapping) {
            throw new ApiError('Ez az időpont már foglalt', 400, 'SLOT_TAKEN');
        }

        // Create booking with check-in code
        const checkInCode = crypto.randomBytes(16).toString('hex');
        const booking = await prisma.booking.create({
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

        // Send notification
        await BookingNotificationService.createdBooking(booking);

        res.status(201).json({ success: true, data: booking });
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
            where: { id: req.params.id },
        });

        if (!booking) {
            throw new ApiError('Foglalás nem található', 404, 'NOT_FOUND');
        }

        // Check permission: user owns booking or is admin
        if (booking.userId !== user.id && user.role !== 'ADMIN') {
            throw new ApiError('Nincs jogosultsága törölni ezt a foglalást', 403, 'FORBIDDEN');
        }

        await prisma.booking.delete({
            where: { id: req.params.id },
        });

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

        res.json({ success: true, data: updatedBooking });
    })
);

// Get user's own bookings
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
                date: { gte: new Date() }, // Only future bookings
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
        const startDate = new Date(req.params.startDate);
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
            where: { id: req.params.id },
        });

        if (!booking) {
            throw new ApiError('Foglalás nem található', 404, 'NOT_FOUND');
        }

        if (booking.userId !== user.id && user.role !== 'ADMIN') {
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
            where: { id: req.params.id },
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
                id: req.params.id,
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

        res.json({ success: true, data: updatedBooking });
    })
);

// Get single computer details
bookingsRouter.get(
    '/computers/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const computer = await prisma.computer.findUnique({
            where: { id: req.params.id },
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

        const { specs, installedGames, status, isActive } = req.body;

        const computer = await prisma.computer.update({
            where: { id: req.params.id },
            data: {
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
            where: { id: req.params.id },
        });

        if (!entry) {
            throw new ApiError('Várólista bejegyzés nem található', 404, 'NOT_FOUND');
        }

        if (entry.userId !== user.id && user.role !== 'ADMIN') {
            throw new ApiError('Nincs jogosultsága', 403, 'FORBIDDEN');
        }

        await prisma.waitlist.delete({
            where: { id: req.params.id },
        });

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
