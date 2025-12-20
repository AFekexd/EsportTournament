
import { Router } from 'express';
import prisma from '../lib/prisma.js'; // Assuming this is where prisma client is exported in new backend
import { emitMachineUpdate, emitUserUpdate, emitSessionUpdate } from '../services/socket.js'; // Import helper from socket service

export const kioskRouter = Router();

// Start Session
kioskRouter.post('/session/start', async (req, res) => {
    const { username, userId, machineId } = req.body;
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
                    position: randomPos
                }
            });
        }

        // Check if machine is locked
        if (machine.isLocked) {
            res.status(403).json({ error: 'Machine is locked by admin' });
            return;
        }

        // Check if user has time (Skip for ADMIN/TEACHER)
        if (!['ADMIN', 'TEACHER'].includes(user.role) && user.timeBalanceSeconds <= 0) {
            res.status(403).json({ error: 'No time balance remaining' });
            return;
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
        await prisma.log.create({
            data: {
                type: 'LOGIN',
                message: `User ${user.username} logged in on ${machine.name} (${machine.hostname})`,
                userId: user.id,
                computerId: machine.id
            }
        });

        // Emit updates
        emitMachineUpdate(machine.hostname || machine.id, { status: 'occupied', userId: user.id });
        emitSessionUpdate({ type: 'start', session });

        res.json({ success: true, session, remainingTime: user.timeBalanceSeconds });
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
            await prisma.log.create({
                data: {
                    type: 'LOGOUT',
                    message: `User ${activeSession.user.username} logged out from ${machine.name}. Duration: ${durationSeconds}s`,
                    userId: activeSession.userId,
                    computerId: machine.id
                }
            });

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
kioskRouter.get('/status/:machineId', async (req, res) => {
    const { machineId } = req.params;

    try {
        let machine = await prisma.computer.findUnique({ where: { hostname: machineId } });
        if (!machine) machine = await prisma.computer.findFirst({ where: { id: machineId } });

        // Default response if machine doesn't exist yet
        if (!machine) {
            res.json({ Locked: false, Message: "Machine not registered" });
            return;
        }

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
            const remaining = isUnlimited ? 999999 : activeSession.user.timeBalanceSeconds - durationSeconds;

            if (remaining <= 0 && !isUnlimited) {
                // Time up!
                res.json({ Locked: true, Message: "Time expired" });
            } else {
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
