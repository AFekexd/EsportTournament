import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
// import { ChangeLogType } from '@prisma/client';

export enum ChangeLogType {
    MAJOR = 'MAJOR',
    MINOR = 'MINOR',
    PATCH = 'PATCH'
}
import { UserRole } from '../utils/enums.js';
import semver from 'semver';

export const changelogRouter: Router = Router();

// Get latest version and history
changelogRouter.get(
    '/',
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const changelogs = await prisma.changelog.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        username: true,
                        displayName: true
                    }
                }
            }
        });

        const latest = changelogs.length > 0 ? changelogs[0] : null;

        res.json({
            success: true,
            data: {
                latestVersion: latest ? latest.version : '0.0.0',
                history: changelogs
            }
        });
    })
);

// Create new release (Admin only)
changelogRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user || ![UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole)) {
            throw new ApiError('Nincs jogosultságod új verzió kiadásához', 403, 'FORBIDDEN');
        }

        const { changes, type, customVersion } = req.body;

        if (!changes || !Array.isArray(changes) || changes.length === 0) {
            throw new ApiError('Legalább egy változtatást meg kell adni', 400, 'INVALID_INPUT');
        }

        // Get latest version
        const latestLog = await prisma.changelog.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        let newVersion = '1.0.0';

        if (latestLog) {
            if (customVersion) {
                if (!semver.valid(customVersion)) {
                    throw new ApiError('Érvénytelen verziószám formátum', 400, 'INVALID_VERSION');
                }
                if (semver.lte(customVersion, latestLog.version)) {
                    throw new ApiError('Az új verziónak nagyobbnak kell lennie az előzőnél', 400, 'INVALID_VERSION');
                }
                newVersion = customVersion;
            } else {
                // Auto increment
                if (!['MAJOR', 'MINOR', 'PATCH'].includes(type)) {
                    throw new ApiError('Érvénytelen verzió típus', 400, 'INVALID_TYPE');
                }
                
                const next = semver.inc(latestLog.version, type.toLowerCase() as semver.ReleaseType);
                if (!next) {
                    throw new ApiError('Verzió növelése sikertelen', 500, 'INTERNAL_ERROR');
                }
                newVersion = next;
            }
        } else if (customVersion) {
            // First release with custom version
             if (!semver.valid(customVersion)) {
                throw new ApiError('Érvénytelen verziószám formátum', 400, 'INVALID_VERSION');
            }
            newVersion = customVersion;
        }

        const log = await prisma.changelog.create({
            data: {
                version: newVersion,
                type: type || 'PATCH',
                changes: changes,
                authorId: user.id
            }
        });

        res.json({ success: true, data: log });
    })
);
