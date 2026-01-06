import { Router } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js'; // Assuming this is where prisma client is exported in new backend
import { emitMachineUpdate, emitUserUpdate, emitSessionUpdate } from '../services/socket.js'; // Import helper from socket service

export const kioskRouter = Router();

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

            // 2. Check Time Balance
            if (user.timeBalanceSeconds <= 0) {
                res.status(403).json({ error: 'Nincs időegyenleged.' });
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
            // Re-fetch booking to be safe or use what we found
            // We found 'activeBooking' earlier if not admin/teacher
             const now = new Date();
             const activeBooking = await prisma.booking.findFirst({
                where: {
                    userId: user.id,
                    computerId: machine.id,
                    startTime: { lte: now },
                    endTime: { gte: now }
                }
            });

            if (activeBooking) {
                 const bookingRemainingSeconds = Math.floor((activeBooking.endTime.getTime() - now.getTime()) / 1000);
                 remainingTime = Math.min(user.timeBalanceSeconds, bookingRemainingSeconds);
                 
                 // Log info
                 console.log(`[SESSION] User balance: ${user.timeBalanceSeconds}s, Booking remaining: ${bookingRemainingSeconds}s -> Final: ${remainingTime}s`);
            } else {
                // Should not happen as we checked earlier, but fallback
                remainingTime = user.timeBalanceSeconds;
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

            // Update user balance (Skip for ADMIN/TEACHER)
            if (!['ADMIN', 'TEACHER'].includes(activeSession.user.role)) {
                await prisma.user.update({
                    where: { id: activeSession.userId },
                    data: {
                        timeBalanceSeconds: { decrement: durationSeconds }
                    }
                });
            }

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
            res.json({ Locked: true, Message: "Admin locked this machine" });
            return;
        }

        if (machine.isCompetitionMode) {
            res.json({ Locked: false, IsCompetitionMode: true, Message: "Competition Mode" });
            return;
        }

        // Check active session
        const activeSession = await prisma.session.findFirst({
            where: { computerId: machine.id, endTime: null },
            include: { user: true }
        });

        if (activeSession) {
            const now = new Date();
            const durationSeconds = Math.floor((now.getTime() - activeSession.startTime.getTime()) / 1000);
            const isUnlimited = ['ADMIN', 'TEACHER'].includes(activeSession.user.role);
            const remaining = isUnlimited ? -1 : activeSession.user.timeBalanceSeconds - durationSeconds;

            if (remaining <= 0 && !isUnlimited) {
                // Time up!
                res.json({ Locked: true, Message: "Time expired" });
            } else {
                 // CLAMP to booking end time also in heartbeat!
                 // If booking ends in 5 mins, but balance is 1 hour, we must return 5 mins.
                 if (!isUnlimited) {
                     const bookingRemaining = Math.floor((activeSession.endTime ? activeSession.endTime.getTime() : 0) - now.getTime()) / 1000; 
                     // Wait, activeSession.endTime is null usually. We need the BOOKING info.
                     // We need to look up the booking again because session doesn't link strictly to a booking ID in the schema (it links to user/computer).
                     
                     // Find the booking that covers NOW
                     const currentBooking = await prisma.booking.findFirst({
                        where: {
                            userId: activeSession.userId,
                            computerId: machine.id,
                            startTime: { lte: now },
                            endTime: { gte: now }
                        }
                     });

                     if (currentBooking) {
                         const bookingTimeLeft = Math.floor((currentBooking.endTime.getTime() - now.getTime()) / 1000);
                         const finalRemaining = Math.min(remaining, bookingTimeLeft);
                         
                         if (finalRemaining <= 0) {
                              res.json({ Locked: true, Message: "Booking time expired" });
                              return;
                         }

                         res.json({ Locked: false, RemainingSeconds: finalRemaining });
                         return;
                     } else {
                         // No active booking covers NOW? Then session should be invalid/closed?
                         // If we are strict: yes.
                         res.json({ Locked: true, Message: "Booking ended" });
                         return;
                     }
                 }

                res.json({ Locked: false, RemainingSeconds: remaining });
            }
        } else {
            // No active session, machine should be locked
            res.json({ Locked: true, Message: "No active session" });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register Machine manually
kioskRouter.post('/register', async (req, res) => {
    const { name, hostname, row, position, adminPassword } = req.body;

    // Simple Admin Password Check (In production use proper auth or env secret)
    if (adminPassword !== '55pollak5565') {
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
