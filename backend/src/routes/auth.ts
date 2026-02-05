import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import prisma from '../lib/prisma.js';
import { discordService } from '../services/discordService.js';
import { authenticate, AuthenticatedRequest, getHighestRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getClientIp } from '../utils/ip.js';

export const authRouter: Router = Router();

// Sync user from Keycloak to database
authRouter.post(
    '/sync',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { sub: keycloakId, email, preferred_username, name, given_name, family_name } = req.user!;
        // Try to find OM ID with case-insensitive property check
        // Keycloak mapper might be 'OM', 'om', 'omId' etc.
        const userPayload = req.user as any;
        const OM = userPayload.OM || userPayload.om || userPayload.omId || userPayload.OM_AZONOSITO;

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
        let preferredName = name || username;
        if (family_name && given_name) {
            preferredName = `${family_name} ${given_name}`;
        }


        const role = getHighestRole(req.user!);

        // Explicitly log the full token payload as requested
        console.log('\n=== FULL KEYCLOAK TOKEN PAYLOAD ===');
        console.log(JSON.stringify(req.user, null, 2));
        console.log('===================================\n');

        console.log('Syncing user:', {
            keycloakId,
            email: userEmail,
            username,
            role,
            omId: OM, // Log the found value
            omSource: userPayload.OM ? 'OM' : (userPayload.om ? 'om' : (userPayload.omId ? 'omId' : 'NOT_FOUND')),
            originalEmail: email,
            originalUsername: preferred_username,
            realmRoles: req.user!.realm_access?.roles
        });

        // Only update role from Keycloak if it's a privileged role
        // This prevents overwriting manually assigned roles in the database with 'STUDENT'
        const roleUpdate = role !== 'STUDENT' ? { role } : {};

        const user = await prisma.user.upsert({
            where: { keycloakId },
            update: {
                email: userEmail,
                username,
                displayName: preferredName,
                omId: OM ? String(OM) : null,
                ...roleUpdate,
            },
            create: {
                keycloakId,
                email: userEmail,
                username,
                displayName: preferredName,
                omId: OM ? String(OM) : null,
                role, // Set role from Keycloak on creation
            },
        });

        // Check if we logged a login recently (throttle to prevent spam from frontend re-renders)
        const recentLog = await prisma.log.findFirst({
            where: {
                userId: user.id,
                type: 'LOGIN',
                createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour
            }
        });

        if (!recentLog) {
            await logSystemActivity(
                'LOGIN',
                `User ${user.username} logged in via Sync`,
                {
                    userId: user.id,
                    metadata: {
                        keycloakId: user.keycloakId,
                        email: user.email, // PII consideration: Internal log, email is fine usually
                        role: user.role,
                        ip: getClientIp(req),
                        userAgent: req.headers['user-agent']
                    }
                }
            );
        }

        // Trigger Discord Sync (Fire and forget, or await if critical)
        try {
            // If user is not linked to Discord, try to find them by username (Auto-link for pre-existing members)
                if (!user.discordId) {
                    const foundDiscordId = await discordService.findDiscordIdByUsername(user.username);
                    if (foundDiscordId) {
                        // Check if this Discord ID is already assigned to another user
                        const existingUserWithId = await prisma.user.findFirst({
                            where: { discordId: foundDiscordId }
                        });

                        if (!existingUserWithId) {
                            await prisma.user.update({
                                where: { id: user.id },
                                data: { discordId: foundDiscordId }
                            });
                            console.log(`🔗 Automatically linked user ${user.username} to Discord ID ${foundDiscordId}`);
                        } else {
                            console.warn(`⚠️ Skipped auto-linking user ${user.username}: Discord ID ${foundDiscordId} is already assigned to ${existingUserWithId.username}`);
                        }
                    }
                }

            // We catch errors here to not fail the login if Discord bot is down or user not in guild
            await discordService.syncUser(user.id).catch(err => console.error('Discord sync failed:', err));
        } catch (error) {
            console.error('Discord sync invocation failed:', error);
        }

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
                favoriteGame: true,
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

// Link Discord via OAuth
authRouter.post(
    '/discord/oauth',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { code } = req.body;

        const keycloakId = req.user!.sub;
        const user = await prisma.user.findUnique({ where: { keycloakId } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!code) {
            return res.status(400).json({ success: false, message: 'Missing OAuth code' });
        }

        const result = await discordService.linkUserViaOAuth(user.id, code);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    })
);
