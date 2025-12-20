
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { emitMachineUpdate } from '../services/socket.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const adminKioskRouter = Router();

// Get all machines
adminKioskRouter.get('/machines', async (req, res) => {
    const machines = await prisma.computer.findMany({
        orderBy: { position: 'asc' }
    });
    res.json(machines);
});

// Admin Remote Unlock / Lock 
adminKioskRouter.post('/machines/:id/lock', async (req, res) => {
    const { id } = req.params;
    const { locked } = req.body; // boolean

    try {
        const machine = await prisma.computer.update({
            where: { id },
            data: { isLocked: locked }
        });

        // Log lock/unlock
        await prisma.log.create({
            data: {
                type: locked ? 'LOCK' : 'UNLOCK',
                message: `Machine ${machine.name} was ${locked ? 'locked' : 'unlocked'} by admin`,
                computerId: id
            }
        });

        // Emit live update to machine
        if (machine.hostname) {
            // We can emit a specific event if the client listens to it, 
            // or the client polls /status which will pick up the lock state.
            emitMachineUpdate(machine.hostname, { locked });
        }

        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

// Add time to user
adminKioskRouter.post('/users/:id/add-time', authenticate, requireRole('ADMIN', 'TEACHER'), async (req, res) => {
    const { id } = req.params;
    const { seconds } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id },
            data: { timeBalanceSeconds: { increment: Number(seconds) } }
        });

        // Log add/remove time
        const secondsNum = Number(seconds);
        const actionType = secondsNum >= 0 ? 'ADD_TIME' : 'REMOVE_TIME';
        const actionMsg = secondsNum >= 0 ? 'Added' : 'Removed';

        await prisma.log.create({
            data: {
                type: actionType,
                message: `${actionMsg} ${Math.abs(secondsNum)} seconds ${secondsNum >= 0 ? 'to' : 'from'} user ${user.username}`,
                userId: user.id
            }
        });

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Toggle Competition Mode
adminKioskRouter.post('/machines/:id/competition-mode', async (req, res) => {
    const { id } = req.params;
    const { enabled } = req.body; // boolean

    try {
        const machine = await prisma.computer.update({
            where: { id },
            data: { isCompetitionMode: enabled }
        });

        // Log
        await prisma.log.create({
            data: {
                type: 'COMPETITION_MODE',
                message: `Machine ${machine.name} competition mode ${enabled ? 'enabled' : 'disabled'} by admin`,
                computerId: id
            }
        });

        res.json(machine);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update machine' });
    }
});

// Get logs (recent)
adminKioskRouter.get('/logs', async (req, res) => {
    const logs = await prisma.log.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: true, computer: true }
    });
    res.json(logs);
});

// Reset Password (Admin Only)
// NOTE: Ideally this talks to Keycloak directly. For now assuming we can update local or via Keycloak helper if implemented.
// Since we don't have Keycloak Admin Client configured fully in this file, we might skip actual Keycloak update if not easy.
// BUT the user explicitely asked for "Password Reset".
// Checking old backend... it used admin-cli to get token and fetch Keycloak API. 
// I will implement a basic version that TRIES to update Keycloak if env vars are present.

import { getToken } from '../utils/keycloak-admin.js'; // We might need to create this helper or inline it.

adminKioskRouter.post('/users/:id/reset-password', authenticate, requireRole('ADMIN'), async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update in Keycloak
        // We need an Admin Token for the Realm.
        // Assuming env vars: KEYCLOAK_BASE_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID, KEYCLOAK_ADMIN_CLIENT_SECRET (or username/password)

        // Inline helper for now to keep it self-contained or move to service later
        const kcBaseUrl = process.env.KEYCLOAK_BASE_URL || 'https://auth.pollak.info';
        const kcRealm = process.env.KEYCLOAK_REALM || 'esport';

        // Get Admin Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('client_id', 'admin-cli'); // standard logic from old backend
        tokenParams.append('grant_type', 'password');
        tokenParams.append('username', process.env.KEYCLOAK_ADMIN_USERNAME || 'admin'); // Needs env var!
        tokenParams.append('password', process.env.KEYCLOAK_ADMIN_PASSWORD || ''); // Needs env var!

        // If no credentials, we can't reset
        if (!process.env.KEYCLOAK_ADMIN_USERNAME || !process.env.KEYCLOAK_ADMIN_PASSWORD) {
            console.error('Missing Keycloak Admin Credentials in .env');
            return res.status(500).json({ error: 'Server misconfigured for password reset' });
        }

        const tokenRes = await fetch(`${kcBaseUrl}/realms/${kcRealm}/protocol/openid-connect/token`, {
            method: 'POST',
            body: tokenParams
        });

        if (!tokenRes.ok) {
            console.error('Failed to get KC Admin Token', await tokenRes.text());
            return res.status(500).json({ error: 'Authentication failed with Identity Provider' });
        }

        const tokenData = await tokenRes.json();
        const adminToken = tokenData.access_token;

        // Reset Password
        // PUT /admin/realms/{realm}/users/{id}/reset-password
        // Body: { type: "password", value: "newpass", temporary: false }

        const resetRes = await fetch(`${kcBaseUrl}/admin/realms/${kcRealm}/users/${user.keycloakId}/reset-password`, {
            method: 'PUT', // Keycloak API uses PUT usually for actions
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'password',
                value: password,
                temporary: false
            })
        });

        if (!resetRes.ok) {
            console.error('Failed to reset password in KC', await resetRes.text());
            return res.status(500).json({ error: 'Failed to reset password in system' });
        }

        // Log it
        await prisma.log.create({
            data: {
                type: 'PASSWORD_RESET',
                message: `Password reset for user ${user.username} by admin`,
                userId: user.id
            }
        });

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
