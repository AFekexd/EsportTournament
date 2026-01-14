import { Router, Response } from 'express';
import { logSystemActivity } from '../services/logService.js';
import { randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';

export const teamsRouter: Router = Router();

// Generate unique join code
function generateJoinCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
}

// Get all teams
// Get all teams
teamsRouter.get(
    '/',
    optionalAuth,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { search, page = '1', limit = '10', my } = req.query;

        // If 'my' param is present, user must be authenticated
        if (my === 'true') {
            if (!req.user) {
                throw new ApiError('Bejelentkezés szükséges a csapatok lekéréséhez', 401, 'UNAUTHORIZED');
            }

            const user = await prisma.user.findUnique({
                where: { keycloakId: req.user.sub },
            });

            if (!user) {
                throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
            }

            const myTeams = await prisma.team.findMany({
                where: {
                    members: {
                        some: { userId: user.id }
                    }
                },
                include: {
                    owner: { select: { id: true, username: true, displayName: true } },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    displayName: true,
                                    avatarUrl: true,
                                    ranks: true
                                }
                            },
                        },
                    },
                    _count: { select: { tournamentEntries: true } },
                },
                orderBy: { createdAt: 'desc' }, // Show newest teams first for 'my teams'
            });

            // For 'my teams', we typically don't need pagination as much, or handle it differently
            // Returning all for now to ensure dropdowns work correctly
            res.json({
                success: true,
                data: myTeams,
                pagination: {
                    page: 1,
                    limit: myTeams.length,
                    total: myTeams.length,
                    pages: 1,
                },
            });
            return;
        }

        const where = search
            ? {
                OR: [
                    { name: { contains: search as string, mode: 'insensitive' as const } },
                    { description: { contains: search as string, mode: 'insensitive' as const } },
                ],
            }
            : {};

        const teams = await prisma.team.findMany({
            where,
            include: {
                owner: { select: { id: true, username: true, displayName: true } },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                displayName: true,
                                avatarUrl: true,
                                ranks: true
                            }
                        },
                    },
                },
                _count: { select: { tournamentEntries: true } },
            },
            orderBy: { elo: 'desc' },
            skip: (parseInt(page as string) - 1) * parseInt(limit as string),
            take: parseInt(limit as string),
        });

        const total = await prisma.team.count({ where });

        res.json({
            success: true,
            data: teams,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string)),
            },
        });
    })
);

// Create team
teamsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { name, description, logoUrl, coverUrl } = req.body;

        if (!name || name.length < 3) {
            throw new ApiError('A csapatnévnek legalább 3 karakternek kell lennie', 400, 'INVALID_NAME');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Process logo image if base64
        let processedLogoUrl = logoUrl;
        if (logoUrl && isBase64DataUrl(logoUrl)) {
            if (!validateImageSize(logoUrl, 150)) {
                throw new ApiError('A logó túl nagy (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedLogoUrl = await processImage(logoUrl);
        }

        // Process cover image if base64
        let processedCoverUrl = coverUrl;
        if (coverUrl && isBase64DataUrl(coverUrl)) {
            if (!validateImageSize(coverUrl, 150)) {
                throw new ApiError('A borítókép túl nagy (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedCoverUrl = await processImage(coverUrl);
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                logoUrl: processedLogoUrl,
                coverUrl: processedCoverUrl,
                joinCode: generateJoinCode(),
                ownerId: user.id,
                members: {
                    create: {
                        userId: user.id,
                        role: 'CAPTAIN',
                    },
                },
            },
            include: {
                owner: { select: { id: true, username: true, displayName: true } },
                members: {
                    include: {
                        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
                    },
                },
            },
        });

        // Log team creation
        await logSystemActivity(
            'TEAM_CREATE',
            `Team '${team.name}' created by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    teamId: team.id,
                    teamName: team.name
                }
            }
        );

        res.status(201).json({ success: true, data: team });
    })
);

// Get team by ID
teamsRouter.get(
    '/:id',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: {
                owner: { select: { id: true, username: true, displayName: true } },
                members: {
                    include: {
                        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
                    },
                },
                tournamentEntries: {
                    include: {
                        tournament: {
                            include: { game: true },
                        },
                    },
                },
            },
        });

        if (!team) {
            throw new ApiError('Csapat nem található', 404, 'NOT_FOUND');
        }

        res.json({ success: true, data: team });
    })
);

// Update team
teamsRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: { owner: true },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (team.owner.keycloakId !== req.user!.sub && !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Only team owner or admin can update team', 403, 'FORBIDDEN');
        }

        const { name, description, logoUrl, coverUrl } = req.body;

        // Process logo image if base64
        let processedLogoUrl = logoUrl;
        if (logoUrl && isBase64DataUrl(logoUrl)) {
            if (!validateImageSize(logoUrl, 150)) {
                throw new ApiError('A logó túl nagy (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedLogoUrl = await processImage(logoUrl);
        }

        // Process cover image if base64
        let processedCoverUrl = coverUrl;
        if (coverUrl && isBase64DataUrl(coverUrl)) {
            if (!validateImageSize(coverUrl, 150)) {
                throw new ApiError('A borítókép túl nagy (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedCoverUrl = await processImage(coverUrl);
        }

        // If not Admin/Organizer, create Change Request instead of immediate update
        if (!['ADMIN', 'ORGANIZER', 'MODERATOR'].includes(user.role)) {
            // Check for existing pending request
            const existingRequest = await prisma.changeRequest.findFirst({
                where: {
                    entityId: req.params.id,
                    type: 'TEAM_PROFILE',
                    status: 'PENDING'
                }
            });

            if (existingRequest) {
                throw new ApiError('Ennek a csapatnak már van függőben lévő kérelme.', 400, 'DUPLICATE_REQUEST');
            }

            await prisma.changeRequest.create({
                data: {
                    type: 'TEAM_PROFILE',
                    entityId: req.params.id,
                    requesterId: user.id,
                    data: {
                        ...(name && { name }),
                        ...(description !== undefined && { description }),
                        ...(processedLogoUrl !== undefined && { logoUrl: processedLogoUrl }),
                        ...(processedCoverUrl !== undefined && { coverUrl: processedCoverUrl }),
                    }
                }
            });

            res.status(202).json({
                success: true,
                message: 'A változtatások jóváhagyásra várnak.',
                data: team // Return current data
            });
            return;
        }

        const updatedTeam = await prisma.team.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(processedLogoUrl !== undefined && { logoUrl: processedLogoUrl }),
                ...(processedCoverUrl !== undefined && { coverUrl: processedCoverUrl }),
            },
        });

        // Log team update
        // Log team update
        const changes: string[] = [];
        if (name) changes.push(`Name ('${name}')`);
        if (description !== undefined) changes.push('Description');
        if (processedLogoUrl !== undefined) changes.push('Logo');
        if (processedCoverUrl !== undefined) changes.push('Cover');

        await logSystemActivity(
            'TEAM_UPDATE',
            `Team '${updatedTeam.name}' updated by ${user.username}. Changes: ${changes.join(', ')}`,
            {
                userId: user.id,
                metadata: {
                    teamId: updatedTeam.id,
                    changes,
                    updatedFields: {
                        ...(name && { name }),
                        ...(description !== undefined && { description }),
                        ...(processedLogoUrl !== undefined && { logoUrl: 'updated' }),
                        ...(processedCoverUrl !== undefined && { coverUrl: 'updated' })
                    }
                }
            }
        );

        res.json({ success: true, data: updatedTeam });
    })
);

// Delete team
teamsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: { owner: true },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        if (team.owner.keycloakId !== req.user!.sub && !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Only team owner or admin can delete team', 403, 'FORBIDDEN');
        }

        await prisma.team.delete({ where: { id: req.params.id } });

        // Log team deletion
        await logSystemActivity(
            'TEAM_DELETE',
            `Team '${team.name}' deleted by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    teamId: team.id,
                    teamName: team.name,
                    deletedBy: user.username
                }
            }
        );

        res.json({ success: true, message: 'Team deleted' });
    })
);

// Join team with code
teamsRouter.post(
    '/join',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { code } = req.body;

        if (!code) {
            throw new ApiError('Join code is required', 400, 'MISSING_CODE');
        }

        const team = await prisma.team.findUnique({
            where: { joinCode: code.toUpperCase() },
        });

        if (!team) {
            throw new ApiError('Invalid join code', 404, 'INVALID_CODE');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        // Check if already a member
        const existingMember = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: team.id } },
        });

        if (existingMember) {
            throw new ApiError('Már tagja vagy ennek a csapatnak', 400, 'ALREADY_MEMBER');
        }

        const member = await prisma.teamMember.create({
            data: {
                userId: user.id,
                teamId: team.id,
                role: 'MEMBER',
            },
            include: {
                team: true,
                user: { select: { id: true, username: true, displayName: true } },
            },
        });

        // Log join
        await logSystemActivity(
            'TEAM_JOIN',
            `User ${user.username} joined team '${team.name}'`,
            {
                userId: user.id,
                metadata: {
                    teamId: team.id,
                    teamName: team.name
                }
            }
        );

        res.status(201).json({ success: true, data: member });
    })
);

// Leave team
teamsRouter.post(
    '/:id/leave',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
        }

        // Owner cannot leave, must delete or transfer
        if (team.ownerId === user.id) {
            throw new ApiError('Team owner cannot leave. Transfer ownership or delete the team.', 400, 'OWNER_CANNOT_LEAVE');
        }

        await prisma.teamMember.delete({
            where: { userId_teamId: { userId: user.id, teamId: team.id } },
        });

        // Log leave
        await logSystemActivity(
            'TEAM_LEAVE',
            `User ${user.username} left team '${team.name}'`,
            {
                userId: user.id,
                metadata: {
                    teamId: team.id,
                    teamName: team.name
                }
            }
        );

        res.json({ success: true, message: 'Left team successfully' });
    })
);

// Remove member (captain only)
teamsRouter.delete(
    '/:id/members/:memberId',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
        }

        if (team.ownerId !== user.id && !['ADMIN', 'ORGANIZER'].includes(user.role)) {
            throw new ApiError('Only team owner or admin can remove members', 403, 'FORBIDDEN');
        }

        // Cannot remove owner
        if (req.params.memberId === team.ownerId) {
            throw new ApiError('Cannot remove team owner', 400, 'CANNOT_REMOVE_OWNER');
        }

        await prisma.teamMember.delete({
            where: { userId_teamId: { userId: req.params.memberId, teamId: team.id } },
        });

        // Log kick
        await logSystemActivity(
            'TEAM_KICK',
            `Member removed from team '${team.name}' by ${user.username}`,
            {
                userId: user.id,
                metadata: {
                    teamId: team.id,
                    teamName: team.name,
                    kickedMemberId: req.params.memberId
                }
            }
        );

        res.json({ success: true, message: 'Member removed' });
    })
);

// Regenerate join code (captain only)
teamsRouter.post(
    '/:id/regenerate-code',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const team = await prisma.team.findUnique({
            where: { id: req.params.id },
            include: { owner: true },
        });

        if (!team) {
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
        }

        if (team.owner.keycloakId !== req.user!.sub) {
            throw new ApiError('Only team owner can regenerate join code', 403, 'FORBIDDEN');
        }

        const updatedTeam = await prisma.team.update({
            where: { id: req.params.id },
            data: { joinCode: generateJoinCode() },
        });

        // Log code regen
        await logSystemActivity(
            'TEAM_CODE_UPDATE',
            `Join code regenerated for team '${team.name}' by ${req.user!.sub}`,
            {
                userId: team.ownerId,
                metadata: {
                    teamId: team.id
                }
            }
        );

        res.json({ success: true, data: { joinCode: updatedTeam.joinCode } });
    })
);
