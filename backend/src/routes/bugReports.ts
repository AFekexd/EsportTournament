import { Router, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../middleware/errorHandler.js';
import { UserRole } from '../utils/enums.js';
import { emailService } from '../services/emailService.js';
import { generateEmailTemplate } from '../services/emailTemplates.js';
import { discordService } from '../services/discordService.js';
import { processAndValidateImage } from '../utils/imageProcessor.js';

export const bugReportsRouter: Router = Router();

function escapeHtml(str: unknown): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper function to send notifications to configured admins
async function notifyAdminsAboutBugReport(bugReport: any, reporter: any) {
    try {
        const settings = await prisma.bugReportNotificationSetting.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        discordId: true,
                        displayName: true,
                        username: true
                    }
                }
            }
        });

        const categoryLabels: Record<string, string> = {
            'WEBSITE': 'Weboldal',
            'TOURNAMENT': 'Verseny',
            'BOOKING': 'Foglalás',
            'TEAM': 'Csapat',
            'OTHER': 'Egyéb'
        };

        const priorityLabels: Record<string, string> = {
            'LOW': 'Alacsony',
            'MEDIUM': 'Közepes',
            'HIGH': 'Magas'
        };

        const safeReporterName = escapeHtml(reporter.displayName || reporter.username);
        const safeTitle = escapeHtml(bugReport.title);
        const safeCategory = escapeHtml(categoryLabels[bugReport.category] || bugReport.category);
        const safePriority = escapeHtml(priorityLabels[bugReport.priority] || bugReport.priority);
        const safeDescription = escapeHtml(bugReport.description).replace(/\n/g, '<br>');

        for (const setting of settings) {
            // Send email notification
            if (setting.receiveEmail && setting.user.email) {
                const adminUrl = `${process.env.FRONTEND_URL || 'https://esport.pollak.info'}/admin?tab=bug-reports`;
                emailService.sendEmail({
                    to: setting.user.email,
                    subject: `[Pollák Esport] 🐛 Új hibajelentés: ${bugReport.title}`,
                    type: 'SYSTEM',
                    html: generateEmailTemplate({
                        title: 'Új Hibajelentés Érkezett',
                        badgeText: 'ESPORT // HIBAJELENTÉS',
                        badgeColor: 'rose',
                        content: `
                            <p style="margin: 0 0 16px; color: #E2E8F0;">
                                Új hibajelentést rögzített egy felhasználó az Esport rendszerben:
                            </p>
                            
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 16px;">
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #1E293B; color: #94A3B8; font-size: 13px;">Bejelentő:</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #1E293B; color: #FFFFFF; font-weight: 700; font-size: 13px;" align="right">${safeReporterName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #1E293B; color: #94A3B8; font-size: 13px;">Kategória:</td>
                                    <td style="padding: 10px 16px; border-bottom: 1px solid #1E293B; color: #38BDF8; font-size: 13px;" align="right">${safeCategory}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 16px; color: #94A3B8; font-size: 13px;">Prioritás:</td>
                                    <td style="padding: 10px 16px; color: #EF4444; font-weight: 700; font-size: 13px;" align="right">${safePriority}</td>
                                </tr>
                            </table>

                            <div style="background-color: #162032; border: 1px solid #1E293B; border-radius: 6px; padding: 14px 16px; margin-bottom: 16px;">
                                <div style="font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px;">Leírás</div>
                                <div style="color: #F8FAFC; line-height: 1.6; font-size: 14px;">${safeDescription}</div>
                            </div>
                        `,
                        button: {
                            text: 'Megtekintés az Admin felületen →',
                            url: adminUrl
                        }
                    })
                }).catch(err => console.error('Bug report email notification failed:', err));
            }

            // Send Discord DM notification
            if (setting.receiveDiscord && setting.user.discordId) {
                discordService.sendDM(setting.user.discordId, {
                    title: `🐛 Új hibajelentés: ${bugReport.title}`,
                    description: bugReport.description.substring(0, 500) + (bugReport.description.length > 500 ? '...' : ''),
                    color: bugReport.priority === 'HIGH' ? 0xe74c3c : bugReport.priority === 'MEDIUM' ? 0xf39c12 : 0x2ecc71,
                    fields: [
                        { name: 'Bejelentő', value: reporter.displayName || reporter.username, inline: true },
                        { name: 'Kategória', value: categoryLabels[bugReport.category] || bugReport.category, inline: true },
                        { name: 'Prioritás', value: priorityLabels[bugReport.priority] || bugReport.priority, inline: true }
                    ],
                    timestamp: new Date().toISOString()
                }).catch(err => console.error('Bug report Discord notification failed:', err));
            }
        }
    } catch (error) {
        console.error('Failed to send bug report notifications:', error);
    }
}

// Create a new bug report
bugReportsRouter.post(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const { title, description, category, priority, imageUrl } = req.body;

        if (!title || !description || !category) {
            throw new ApiError('Cím, leírás és kategória megadása kötelező', 400, 'INVALID_INPUT');
        }

        const validCategories = ['WEBSITE', 'TOURNAMENT', 'BOOKING', 'TEAM', 'OTHER'];
        if (!validCategories.includes(category)) {
            throw new ApiError('Érvénytelen kategória', 400, 'INVALID_CATEGORY');
        }

        const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
        if (priority && !validPriorities.includes(priority)) {
            throw new ApiError('Érvénytelen prioritás', 400, 'INVALID_PRIORITY');
        }

        let processedImageUrl: string | undefined = undefined;
        if (imageUrl) {
            try {
                processedImageUrl = await processAndValidateImage(imageUrl, 15);
            } catch (err: any) {
                throw new ApiError(err.message || 'Érvénytelen képformátum', 400, 'INVALID_IMAGE');
            }
        }

        const bugReport = await prisma.bugReport.create({
            data: {
                title,
                description,
                category,
                priority: priority || 'MEDIUM',
                imageUrl: processedImageUrl || null,
                reporterId: user.id
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        // Send notifications to configured admins (fire and forget)
        notifyAdminsAboutBugReport(bugReport, user);

        res.status(201).json({ success: true, data: bugReport });
    })
);

// Get bug reports (own for users, all for admins)
bugReportsRouter.get(
    '/',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);
        const { status, category, mine } = req.query;

        const where: any = {};

        // If 'mine=true' is passed, always filter by current user (for "My Reports" section)
        // Otherwise, non-admins can only see their own reports
        if (mine === 'true' || !isAdmin) {
            where.reporterId = user.id;
        }

        // Filter by status if provided
        if (status && typeof status === 'string') {
            where.status = status;
        }

        // Filter by category if provided
        if (category && typeof category === 'string') {
            where.category = category;
        }

        const bugReports = await prisma.bugReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json({ success: true, data: bugReports });
    })
);

// Get a single bug report
bugReportsRouter.get(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const bugReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        if (!bugReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        // Non-admins can only see their own reports
        if (!isAdmin && bugReport.reporterId !== user.id) {
            throw new ApiError('Nincs jogosultságod megtekinteni ezt a hibajelentést', 403, 'FORBIDDEN');
        }

        res.json({ success: true, data: bugReport });
    })
);

// Update bug report (admin only: status, adminNote)
bugReportsRouter.patch(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        if (!isAdmin) {
            throw new ApiError('Nincs jogosultságod módosítani a hibajelentést', 403, 'FORBIDDEN');
        }

        const { status, adminNote, priority, createChangelog, changelogDescription } = req.body;

        const existingReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id }
        });

        if (!existingReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        const updateData: any = {};

        if (status) {
            const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
            if (!validStatuses.includes(status)) {
                throw new ApiError('Érvénytelen státusz', 400, 'INVALID_STATUS');
            }
            updateData.status = status;

            // Set resolvedAt when status changes to RESOLVED
            if (status === 'RESOLVED' && existingReport.status !== 'RESOLVED') {
                updateData.resolvedAt = new Date();

                // Create changelog entry if requested
                if (createChangelog) {
                    const changeDescription = changelogDescription || `🐛 ${existingReport.title}`;

                    // Get latest changelog version
                    const latestLog = await prisma.changelog.findFirst({
                        orderBy: { createdAt: 'desc' }
                    });

                    let newVersion = '1.0.0';
                    if (latestLog) {
                        // Simple PATCH increment
                        const parts = latestLog.version.split('.').map(Number);
                        parts[2] = parts[2] + 1;
                        newVersion = parts.join('.');
                    }

                    await prisma.changelog.create({
                        data: {
                            version: newVersion,
                            type: 'PATCH',
                            changes: [changeDescription],
                            authorId: user.id
                        }
                    });
                }
            }
        }

        if (adminNote !== undefined) {
            updateData.adminNote = adminNote;
        }

        if (priority) {
            const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
            if (!validPriorities.includes(priority)) {
                throw new ApiError('Érvénytelen prioritás', 400, 'INVALID_PRIORITY');
            }
            updateData.priority = priority;
        }

        const bugReport = await prisma.bugReport.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true
                    }
                }
            }
        });

        res.json({ success: true, data: bugReport });
    })
);

// Delete bug report (admin only)
bugReportsRouter.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({ where: { keycloakId: req.user!.sub } });

        if (!user) {
            throw new ApiError('Felhasználó nem található', 404, 'USER_NOT_FOUND');
        }

        const isAdmin = [UserRole.ADMIN, UserRole.ORGANIZER].includes(user.role as UserRole);

        if (!isAdmin) {
            throw new ApiError('Nincs jogosultságod törölni a hibajelentést', 403, 'FORBIDDEN');
        }

        const existingReport = await prisma.bugReport.findUnique({
            where: { id: req.params.id }
        });

        if (!existingReport) {
            throw new ApiError('Hibajelentés nem található', 404, 'NOT_FOUND');
        }

        await prisma.bugReport.delete({
            where: { id: req.params.id }
        });

        res.json({ success: true, message: 'Hibajelentés sikeresen törölve' });
    })
);
