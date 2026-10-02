import { Router } from 'express';
import crypto from 'crypto';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js'; // Assuming this is where prisma client is exported in new backend
import { emitMachineUpdate, emitUserUpdate, emitSessionUpdate } from '../services/socket.js'; // Import helper from socket service

export const kioskRouter: Router = Router();

// Start Session
kioskRouter.post('/session/start', async (req, res) => {
    const { username, userId, machineId, version } = req.body;
    // machineId in request is actually the 'id' (hostname) sent by client

    try {
        // Find or create user
        let user = null;

        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } });
        }

        if (!user) {
            user = await prisma.user.findUnique({ where: { username } });
        }

        if (!user) {
            // Default 1 hour for new users for testing
            // Note: New schema requires keycloakId and email which we might not have here if it's a pure local user
            // For now, if user doesn't exist in system, we might need a strategy.
            // Assuming for now these are "Guest" users or we create placeholder

            // For compatibility with strict schema, we might return error if user not found
            // OR create a guest user. Let's create a guest user for now if the schema allows nullable keycloakId (it is unique but not nullable, so this is tricky).
            // Actually, the schema says keycloakId @unique. We need a unique keycloakId.
            // We'll generate a dummy one for kiosk-only users.

            user = await prisma.user.create({
                data: {
                    keycloakId: `kiosk_guest_${Date.now()}`,
                    email: `guest_${Date.now()}@local.kiosk`,
                    username: username || `guest_${Date.now()}`,
                    role: 'STUDENT',
                    timeBalanceSeconds: 100
                }
            });
        }

        // Find or create machine (Computer)
        // We use 'hostname' to match the 'machineId' sent by client
        // Or we assume the client sends the hostname as machineId
        let machine = await prisma.computer.findUnique({ where: { hostname: machineId } });

        // Fallback: search by ID if UUID
        if (!machine) {
            machine = await prisma.computer.findFirst({ where: { OR: [{ id: machineId }, { hostname: machineId }] } });
        }

        if (!machine) {
            // Auto-register machine if not exists (Admin can edit details later)
            // Note: Computer requires row/position which are unique. We need defaults.
            // We will try to find a free spot or create a "Floating" row 999

            // For simplicity, let's error if machine not registered, OR create if migration policy allows.
            // Old logic created it.

            // Let's create with default row 999 position random
            const randomPos = Math.floor(Math.random() * 1000);
            machine = await prisma.computer.create({
                data: {
                    name: machineId,
                    hostname: machineId,
                    row: 999,
                    position: randomPos,
                    clientVersion: version // Set initial version
                }
            });
        }

        // Update client version if provided and different
        if (version && machine.clientVersion !== version) {
            await prisma.computer.update({
                where: { id: machine.id },
                data: { clientVersion: version }
            });
        }

        // Check if machine is locked
        if (machine.isLocked) {
            res.status(403).json({ error: 'Machine is locked by admin' });
            return;
        }

        // Check if user has time & booking (Skip for ADMIN/TEACHER)
        if (!['ADMIN', 'TEACHER'].includes(user.role)) {
            // 1. Check for Active Booking
            const now = new Date();
            const activeBooking = await prisma.booking.findFirst({
                where: {
                    userId: user.id,
                    computerId: machine.id,
                    startTime: { lte: now },
                    endTime: { gte: now }
                }
            });

            if (!activeBooking) {
                res.status(403).json({ error: 'Nincs érvényes foglalásod erre a gépre' });
                return;
            }

        }

        // Close any existing open sessions for this machine
        await prisma.session.updateMany({
            where: { computerId: machine.id, endTime: null },
            data: { endTime: new Date() }
        });

        // Create new session
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                computerId: machine.id,
                startTime: new Date()
            }
        });

        // Log login
        await logSystemActivity(
            'LOGIN',
            `User ${user.username} logged in on ${machine.name} (${machine.hostname})`,
            {
                userId: user.id,
                computerId: machine.id,
                metadata: {
                    sessionId: session.id,
                    version: version,
                    method: 'KIOSK_START'
                }
            }
        );

        // Emit updates
        emitMachineUpdate(machine.hostname || machine.id, { status: 'occupied', userId: user.id });
        emitSessionUpdate({ type: 'start', session });

        // Calculate remaining time based on booking end
        // bookingRemainingSeconds = (activeBooking.endTime - now)
        // returned remainingTime = min(userTimeBalance, bookingRemainingSeconds)

        let remainingTime = -1;

        if (!['ADMIN', 'TEACHER'].includes(user.role)) {
            // Find active booking chain
            const now = new Date();

            // Get all future bookings for this user on this machine
            const futureBookings = await prisma.booking.findMany({
                where: {
                    userId: user.id,
                    computerId: machine.id,
                    endTime: { gt: now }
                },
                orderBy: { startTime: 'asc' }
            });

            // Find the active one (starts before now)
            let currentBookingIndex = futureBookings.findIndex(b => b.startTime <= now && b.endTime >= now);

            if (currentBookingIndex !== -1) {
                // We have an active booking. Now check for consecutive bookings.
                let chainEndTime = futureBookings[currentBookingIndex].endTime;

                // Look ahead
                for (let i = currentBookingIndex + 1; i < futureBookings.length; i++) {
                    const nextBooking = futureBookings[i];
                    // If next booking starts within 1 minute of current chain end, consider it consecutive
                    // (Allowing small gap for system buffers)
                    if (nextBooking.startTime.getTime() <= chainEndTime.getTime() + 60000) {
                        chainEndTime = nextBooking.endTime;
                    } else {
                        break; // Chain broken
                    }
                }

                const bookingRemainingSeconds = Math.floor((chainEndTime.getTime() - now.getTime()) / 1000);

                // Use the booked time directly! User balance is NOT a hard limit for the session duration here.
                // The desktop app uses this to show a countdown.
                remainingTime = bookingRemainingSeconds;

                console.log(`[SESSION] Booking chain end: ${chainEndTime.toISOString()} -> Remaining: ${remainingTime}s`);
            } else {
                remainingTime = 0;
            }
        }

        res.json({ success: true, session, remainingTime });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// End Session
kioskRouter.post('/session/end', async (req, res) => {
    const { machineId } = req.body;

    try {
        // Resolve machine first
        let machine = await prisma.computer.findUnique({ where: { hostname: machineId } });
        if (!machine) machine = await prisma.computer.findFirst({ where: { id: machineId } });

        if (!machine) {
            res.status(404).json({ error: "Machine not found" });
            return;
        }

        const activeSession = await prisma.session.findFirst({
            where: { computerId: machine.id, endTime: null },
            include: { user: true }
        });

        if (activeSession) {
            const now = new Date();
            const durationSeconds = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);

            // Close session
            await prisma.session.update({
                where: { id: activeSession.id },
                data: { endTime: now }
            });

            // Log logout
            await logSystemActivity(
                'LOGOUT',
                `User ${activeSession.user.username} logged out from ${machine.name}. Duration: ${durationSeconds}s`,
                {
                    userId: activeSession.userId,
                    computerId: machine.id,
                    metadata: {
                        sessionId: activeSession.id,
                        durationSeconds,
                        forced: false // Client initiated
                    }
                }
            );

            // Emit updates
            emitMachineUpdate(machine.hostname || machine.id, { status: 'available' });
            emitSessionUpdate({ type: 'end', session: activeSession });
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all computers (simple list for dropdowns)
kioskRouter.get('/computers', async (req, res) => {
    try {
        const computers = await prisma.computer.findMany({
            select: { id: true, name: true, hostname: true }, 
            orderBy: { name: 'asc' }
        });
        res.json(computers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get Status (Heartbeat)
// Accepts optional query param ?version=x.y.z to update DB
kioskRouter.get('/status/:machineId', async (req, res) => {
    const { machineId } = req.params;
    const version = req.query.version as string;

    try {
        let machine = await prisma.computer.findUnique({ where: { hostname: machineId } });
        if (!machine) machine = await prisma.computer.findFirst({ where: { id: machineId } });

        // Default response if machine doesn't exist yet
        if (!machine) {
            res.json({ Locked: false, Message: "Machine not registered" });
            return;
        }

        // Update version if changed (Fire and forget)
        if (version && machine.clientVersion !== version) {
            prisma.computer.update({
                where: { id: machine.id },
                data: { clientVersion: version }
            }).catch(e => console.error("Failed to update version", e));
        }

        // Always update 'updatedAt' (Heartbeat)
        prisma.computer.update({
            where: { id: machine.id },
            data: { updatedAt: new Date() }
        }).catch(e => console.error("Failed to update heartbeat", e));

        if (machine.isLocked) {
            res.json({ Locked: true, Message: "Admin locked this machine", MachineName: machine.name });
            return;
        }

        if (machine.isCompetitionMode) {
            res.json({ Locked: false, IsCompetitionMode: true, Message: "Competition Mode", MachineName: machine.name });
            return;
        }

        // Check active session
        const activeSession = await prisma.session.findFirst({
            where: { computerId: machine.id, endTime: null },
            include: { user: true }
        });

        if (activeSession) {
            const now = new Date();
            const isUnlimited = ['ADMIN', 'TEACHER'].includes(activeSession.user.role);

            if (isUnlimited) {
                res.json({ Locked: false, RemainingSeconds: -1, MachineName: machine.name });
                return;
            }

            // Find active booking chain
            const futureBookings = await prisma.booking.findMany({
                where: {
                    userId: activeSession.userId,
                    computerId: machine.id,
                    endTime: { gt: now }
                },
                orderBy: { startTime: 'asc' }
            });

            // Find the active one
            let currentBookingIndex = futureBookings.findIndex(b => b.startTime <= now && b.endTime >= now);

            if (currentBookingIndex !== -1) {
                let chainEndTime = futureBookings[currentBookingIndex].endTime;

                // Look ahead for consecutive bookings
                for (let i = currentBookingIndex + 1; i < futureBookings.length; i++) {
                    const nextBooking = futureBookings[i];
                    if (nextBooking.startTime.getTime() <= chainEndTime.getTime() + 60000) {
                        chainEndTime = nextBooking.endTime;
                    } else {
                        break;
                    }
                }

                const bookingTimeLeft = Math.floor((chainEndTime.getTime() - now.getTime()) / 1000);

                if (bookingTimeLeft <= 0) {
                    res.json({ Locked: true, Message: "A foglalási időd lejárt", MachineName: machine.name });
                    return;
                }

                res.json({ Locked: false, RemainingSeconds: bookingTimeLeft, MachineName: machine.name });
                return;
            } else {
                res.json({ Locked: true, Message: "Nincs érvényes foglalásod erre a gépre", MachineName: machine.name });
                return;
            }
        } else {
            // No active session, machine should be locked
            res.json({ Locked: true, Message: "No active session", MachineName: machine.name });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register Machine manually
kioskRouter.post('/register', async (req, res) => {
    const { name, hostname, row, position, adminPassword } = req.body;

    const expectedPassword = process.env.KIOSK_ADMIN_PASSWORD;
    if (!expectedPassword) {
        console.error('[KIOSK] KIOSK_ADMIN_PASSWORD is not set in environment variables');
        res.status(503).json({ error: 'A gép regisztráció jelenleg nincs konfigurálva a szerveren' });
        return;
    }

    const providedBuffer = Buffer.from(String(adminPassword || ''));
    const expectedBuffer = Buffer.from(expectedPassword);

    if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
        res.status(401).json({ error: 'Hibás admin jelszó' });
        return;
    }

    try {
        const existing = await prisma.computer.findUnique({ where: { hostname } });
        if (existing) {
            res.status(400).json({ error: 'A gép már regisztrálva van' });
            return;
        }

        // Check if row/pos is taken
        const spotTaken = await prisma.computer.findFirst({
            where: { row: parseInt(row), position: parseInt(position) }
        });

        if (spotTaken) {
            res.status(400).json({ error: 'A megadott sor/pozíció már foglalt' });
            return;
        }

        const computer = await prisma.computer.create({
            data: {
                name,
                hostname,
                row: parseInt(row),
                position: parseInt(position),
                isActive: true
            }
        });

        await logSystemActivity(
            'COMPUTER_REGISTER',
            `Computer ${computer.name} registered via Kiosk API`,
            {
                computerId: computer.id,
                metadata: {
                    hostname: computer.hostname,
                    row: computer.row,
                    position: computer.position
                }
            }
        );

        res.json({ success: true, data: computer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Log Declaration Acceptance
kioskRouter.post('/declaration/accept', async (req, res) => {
    const { userId, username, machineId } = req.body;

    try {
        // Find user
        let user = null;
        if (userId) {
            user = await prisma.user.findUnique({ where: { id: userId } });
        }
        if (!user && username) {
            user = await prisma.user.findUnique({ where: { username } });
        }

        // Find machine
        let machine = null;
        if (machineId) {
            machine = await prisma.computer.findUnique({ where: { hostname: machineId } });
            if (!machine) {
                machine = await prisma.computer.findFirst({ where: { id: machineId } });
            }
        }

        // Log the acceptance
        await logSystemActivity(
            'DECLARATION_ACCEPTED',
            `User ${user?.username || username || 'unknown'} accepted usage declaration on ${machine?.name || machineId || 'unknown machine'}`,
            {
                userId: user?.id,
                computerId: machine?.id,
                metadata: {
                    acceptedAt: new Date().toISOString(),
                    machineHostname: machineId
                }
            }
        );

        console.log(`[DECLARATION] User ${user?.username || username} accepted declaration on ${machine?.hostname || machineId}`);

        res.json({ success: true });
    } catch (error) {
        console.error('[DECLARATION] Error logging acceptance:', error);
        // Don't fail the request, just log the error
        res.json({ success: true, warning: 'Failed to log acceptance' });
    }
});
