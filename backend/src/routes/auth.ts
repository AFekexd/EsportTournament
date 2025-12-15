import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const authRouter = Router();

// Sync user from Keycloak to database
authRouter.post(
    '/sync',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sub: keycloakId, email, preferred_username, name } = req.user!;

        if (!keycloakId || !email || !preferred_username) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing required user info from token' },
            });
        }

        const user = await prisma.user.upsert({
            where: { keycloakId },
            update: {
                email,
                username: preferred_username,
                displayName: name || preferred_username,
            },
            create: {
                keycloakId,
                email,
                username: preferred_username,
                displayName: name || preferred_username,
            },
        });

        res.json({ success: true, data: user });
    })
);

// Get current user info
authRouter.get(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
            include: {
                teamMemberships: {
                    include: {
                        team: true,
                    },
                },
                ownedTeams: true,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not found. Please sync first.' },
            });
        }

        res.json({ success: true, data: user });
    })
);
