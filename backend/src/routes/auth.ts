import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, getHighestRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const authRouter = Router();

// Sync user from Keycloak to database
authRouter.post(
    '/sync',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sub: keycloakId, email, preferred_username, name } = req.user!;

        if (!keycloakId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Missing keycloak ID from token' },
            });
        }

        // Use fallback values if email or username is missing from token
        // This can happen when Keycloak client scopes are not properly configured
        const userEmail = email || `${keycloakId}@keycloak.local`;
        const username = preferred_username || keycloakId;

        // Get the role from Keycloak token
        const role = getHighestRole(req.user!);

        console.log('Syncing user:', {
            keycloakId,
            email: userEmail,
            username,
            role,
            originalEmail: email,
            originalUsername: preferred_username,
            realmRoles: req.user!.realm_access?.roles
        });

        const user = await prisma.user.upsert({
            where: { keycloakId },
            update: {
                email: userEmail,
                username,
                displayName: name || username,
                role, // Update role from Keycloak
            },
            create: {
                keycloakId,
                email: userEmail,
                username,
                displayName: name || username,
                role, // Set role from Keycloak
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
