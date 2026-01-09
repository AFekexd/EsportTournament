import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';

export const logsRouter = Router();

// Get logs with filtering and pagination (Admin only)
logsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const currentUser = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!currentUser || currentUser.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;
        const userId = req.query.userId as string;
        const search = req.query.search as string;

        const skip = (page - 1) * limit;

        const where: any = {};

        if (type) {
            where.type = type;
        }

        if (userId) {
            where.userId = userId;
        }

        if (search) {
            where.OR = [
                { message: { contains: search, mode: 'insensitive' } },
                { user: { username: { contains: search, mode: 'insensitive' } } },
                { user: { displayName: { contains: search, mode: 'insensitive' } } },
                { admin: { username: { contains: search, mode: 'insensitive' } } },
                { admin: { displayName: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.log.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                        }
                    },
                    computer: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                    admin: {
                        select: {
                            id: true,
                            username: true,
                            displayName: true,
                            avatarUrl: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.log.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                }
            }
        });
    })
);
