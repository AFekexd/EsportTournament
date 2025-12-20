import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import { processImage, isBase64DataUrl, validateImageSize } from '../utils/imageProcessor.js';

export const teamsRouter = Router();

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
                throw new ApiError('Authentication required to fetch your teams', 401, 'UNAUTHORIZED');
            }

            const user = await prisma.user.findUnique({
                where: { keycloakId: req.user.sub },
            });

            if (!user) {
                throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
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
                            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
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
                        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
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
        const { name, description, logoUrl } = req.body;

        if (!name || name.length < 3) {
            throw new ApiError('Team name must be at least 3 characters', 400, 'INVALID_NAME');
        }

        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user) {
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Process logo image if base64
        let processedLogoUrl = logoUrl;
        if (logoUrl && isBase64DataUrl(logoUrl)) {
            if (!validateImageSize(logoUrl, 150)) {
                throw new ApiError('Logo too large (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedLogoUrl = await processImage(logoUrl);
        }

        const team = await prisma.team.create({
            data: {
                name,
                description,
                logoUrl: processedLogoUrl,
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
            throw new ApiError('Team not found', 404, 'NOT_FOUND');
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

        if (team.owner.keycloakId !== req.user!.sub) {
            throw new ApiError('Only team owner can update team', 403, 'FORBIDDEN');
        }

        const { name, description, logoUrl } = req.body;

        // Process logo image if base64
        let processedLogoUrl = logoUrl;
        if (logoUrl && isBase64DataUrl(logoUrl)) {
            if (!validateImageSize(logoUrl, 150)) {
                throw new ApiError('Logo too large (max 150MB)', 400, 'IMAGE_TOO_LARGE');
            }
            processedLogoUrl = await processImage(logoUrl);
        }

        const updatedTeam = await prisma.team.update({
            where: { id: req.params.id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(processedLogoUrl !== undefined && { logoUrl: processedLogoUrl }),
            },
        });

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

        if (team.owner.keycloakId !== req.user!.sub) {
            throw new ApiError('Only team owner can delete team', 403, 'FORBIDDEN');
        }

        await prisma.team.delete({ where: { id: req.params.id } });

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
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
        }

        // Check if already a member
        const existingMember = await prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: user.id, teamId: team.id } },
        });

        if (existingMember) {
            throw new ApiError('Already a member of this team', 400, 'ALREADY_MEMBER');
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
            throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
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

        if (team.ownerId !== user.id) {
            throw new ApiError('Only team owner can remove members', 403, 'FORBIDDEN');
        }

        // Cannot remove owner
        if (req.params.memberId === team.ownerId) {
            throw new ApiError('Cannot remove team owner', 400, 'CANNOT_REMOVE_OWNER');
        }

        await prisma.teamMember.delete({
            where: { userId_teamId: { userId: req.params.memberId, teamId: team.id } },
        });

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

        res.json({ success: true, data: { joinCode: updatedTeam.joinCode } });
    })
);
