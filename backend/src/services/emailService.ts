import "dotenv/config";
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import prisma from '../lib/prisma.js';
import { EmailStatus, EmailType } from '../generated/prisma/client.js';
import * as templates from './emailTemplates.js';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    type: EmailType;
    metadata?: Record<string, any>;
}

interface RetryOptions {
    maxAttempts?: number;
    delayMs?: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    delayMs: 1000
};

class EmailService {
    private transporter: Transporter | null = null;
    private enabled: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

        // Only enable if all email config is present
        if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
            this.transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: parseInt(SMTP_PORT),
                secure: parseInt(SMTP_PORT) === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });
            this.enabled = true;
            console.log('✅ Email service initialized');
        } else {
            console.log('⚠️  Email service disabled (missing configuration)');
        }
    }

    /**
     * Check if a user wants to receive a specific type of email
     */
    async shouldSendEmail(userId: string, type: EmailType): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                emailNotifications: true,
                emailPrefTournaments: true,
                emailPrefMatches: true,
                emailPrefBookings: true,
                emailPrefSystem: true,
                emailPrefWeeklyDigest: true
            }
        });

        if (!user || !user.emailNotifications) return false;

        switch (type) {
            case 'TOURNAMENT_INVITE':
            case 'TOURNAMENT_ANNOUNCEMENT':
                return user.emailPrefTournaments;
            case 'MATCH_REMINDER':
            case 'MATCH_RESULT':
                return user.emailPrefMatches;
            case 'BOOKING_CONFIRMATION':
            case 'BOOKING_REMINDER':
            case 'BOOKING_CANCELLED':
            case 'WAITLIST_AVAILABLE':
                return user.emailPrefBookings;
            case 'SYSTEM':
                return user.emailPrefSystem;
            case 'DIGEST':
                return user.emailPrefWeeklyDigest;
            case 'ADMIN_BROADCAST':
                return true; // Admin broadcasts always go through
            default:
                return true;
        }
    }

    /**
     * Send email with retry logic and logging
     */
    async sendEmail(options: EmailOptions, retryOptions: RetryOptions = {}): Promise<boolean> {
        const { maxAttempts, delayMs } = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

        if (!this.enabled || !this.transporter) {
            console.log('Email not sent (service disabled):', options.subject);
            // Still log as pending if service is disabled
            await this.logEmail(options, 'PENDING', 0, 'Email service disabled');
            return false;
        }

        let lastError: Error | null = null;
        let attempt = 0;

        while (attempt < maxAttempts!) {
            attempt++;
            try {
                await this.transporter.sendMail({
                    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                    to: options.to,
                    subject: options.subject,
                    html: options.html,
                });

                console.log(`✉️  Email sent to ${options.to}: ${options.subject}`);
                await this.logEmail(options, 'SENT', attempt);
                return true;
            } catch (error) {
                lastError = error as Error;
                console.error(`Email send attempt ${attempt}/${maxAttempts} failed:`, error);

                if (attempt < maxAttempts!) {
                    // Exponential backoff
                    const backoffDelay = delayMs! * Math.pow(2, attempt - 1);
                    await this.delay(backoffDelay);
                }
            }
        }

        // All attempts failed
        console.error('Failed to send email after all retries:', lastError);
        await this.logEmail(options, 'FAILED', attempt, lastError?.message);
        return false;
    }

    private async logEmail(
        options: EmailOptions,
        status: EmailStatus,
        attempts: number,
        error?: string
    ): Promise<void> {
        try {
            await prisma.emailLog.create({
                data: {
                    to: options.to,
                    subject: options.subject,
                    type: options.type,
                    status,
                    attempts,
                    error,
                    metadata: options.metadata,
                    sentAt: status === 'SENT' ? new Date() : null
                }
            });
        } catch (logError) {
            console.error('Failed to log email:', logError);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ===================================
    // TOURNAMENT EMAILS
    // ===================================

    async sendTournamentInvite(to: string, tournamentName: string, tournamentId: string, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'TOURNAMENT_INVITE'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}`;
        const html = templates.tournamentInviteTemplate(tournamentName, url);

        return this.sendEmail({
            to,
            subject: `Meghívó: ${tournamentName}`,
            html,
            type: 'TOURNAMENT_INVITE',
            metadata: { tournamentId, tournamentName }
        });
    }

    async sendNewTournamentNotification(to: string, tournamentName: string, tournamentId: string, startDate?: Date, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'TOURNAMENT_ANNOUNCEMENT'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}`;
        const html = templates.newTournamentTemplate(tournamentName, url, startDate || new Date());

        return this.sendEmail({
            to,
            subject: `Új verseny: ${tournamentName}`,
            html,
            type: 'TOURNAMENT_ANNOUNCEMENT',
            metadata: { tournamentId, tournamentName }
        });
    }

    // ===================================
    // MATCH EMAILS
    // ===================================

    async sendMatchReminder(to: string, matchDetails: { tournament: string; opponent: string; scheduledAt: Date; matchId?: string }, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'MATCH_REMINDER'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${matchDetails.matchId || ''}`;
        const html = templates.matchReminderTemplate(
            matchDetails.tournament,
            matchDetails.opponent,
            matchDetails.scheduledAt,
            url
        );

        return this.sendEmail({
            to,
            subject: `Meccs emlékeztető - ${matchDetails.tournament}`,
            html,
            type: 'MATCH_REMINDER',
            metadata: matchDetails
        });
    }

    async sendMatchResult(to: string, result: { tournament: string; won: boolean; score: string; tournamentId?: string }, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'MATCH_RESULT'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${result.tournamentId || ''}`;
        const html = templates.matchResultTemplate(result.tournament, result.won, result.score, url);

        return this.sendEmail({
            to,
            subject: `Meccs eredmény - ${result.tournament}`,
            html,
            type: 'MATCH_RESULT',
            metadata: result
        });
    }

    // ===================================
    // BOOKING EMAILS
    // ===================================

    async sendBookingConfirmation(
        to: string,
        booking: {
            computerName: string;
            date: string;
            startTime: string;
            endTime: string;
            qrCode?: string;
        },
        userId?: string
    ) {
        if (userId && !(await this.shouldSendEmail(userId, 'BOOKING_CONFIRMATION'))) {
            return false;
        }

        const html = templates.bookingConfirmationTemplate(
            booking.computerName,
            booking.date,
            booking.startTime,
            booking.endTime,
            booking.qrCode
        );

        return this.sendEmail({
            to,
            subject: `Foglalás megerősítve - ${booking.computerName}`,
            html,
            type: 'BOOKING_CONFIRMATION',
            metadata: booking
        });
    }

    async sendBookingReminder(to: string, computerName: string, startTime: string, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'BOOKING_REMINDER'))) {
            return false;
        }

        const html = templates.bookingReminderTemplate(computerName, startTime);

        return this.sendEmail({
            to,
            subject: `Emlékeztető: ${computerName} - ${startTime}`,
            html,
            type: 'BOOKING_REMINDER',
            metadata: { computerName, startTime }
        });
    }

    async sendBookingCancelled(
        to: string,
        booking: { computerName: string; date: string; startTime: string; reason?: string },
        userId?: string
    ) {
        if (userId && !(await this.shouldSendEmail(userId, 'BOOKING_CANCELLED'))) {
            return false;
        }

        const html = templates.bookingCancelledTemplate(
            booking.computerName,
            booking.date,
            booking.startTime,
            booking.reason
        );

        return this.sendEmail({
            to,
            subject: `Foglalás törölve - ${booking.computerName}`,
            html,
            type: 'BOOKING_CANCELLED',
            metadata: booking
        });
    }

    async sendWaitlistNotification(to: string, computerName: string, availableTime: string, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'WAITLIST_AVAILABLE'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking`;
        const html = templates.waitlistNotificationTemplate(computerName, availableTime, url);

        return this.sendEmail({
            to,
            subject: `Felszabadult hely: ${computerName}`,
            html,
            type: 'WAITLIST_AVAILABLE',
            metadata: { computerName, availableTime }
        });
    }

    // ===================================
    // SYSTEM EMAILS
    // ===================================

    async sendSystemNotification(to: string, title: string, message: string, link?: string, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'SYSTEM'))) {
            return false;
        }

        const html = templates.systemNotificationTemplate(title, message, link);

        return this.sendEmail({
            to,
            subject: title,
            html,
            type: 'SYSTEM',
            metadata: { title, message, link }
        });
    }

    // ===================================
    // DIGEST EMAILS
    // ===================================

    async sendWeeklyDigest(
        to: string,
        userName: string,
        upcomingTournaments: Array<{ name: string; startDate: Date; url: string }>,
        stats: { totalMatches: number; wins: number; losses: number },
        userId?: string
    ) {
        if (userId && !(await this.shouldSendEmail(userId, 'DIGEST'))) {
            return false;
        }

        const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/`;
        const html = templates.weeklyDigestTemplate(userName, upcomingTournaments, stats, dashboardUrl);

        return this.sendEmail({
            to,
            subject: `📊 Heti összefoglaló - Esport Tournament`,
            html,
            type: 'DIGEST',
            metadata: { userName, tournamentCount: upcomingTournaments.length, stats }
        });
    }

    // ===================================
    // ADMIN BROADCAST
    // ===================================

    async sendAdminBroadcast(to: string, title: string, message: string, senderName: string) {
        const html = templates.adminBroadcastTemplate(title, message, senderName);

        return this.sendEmail({
            to,
            subject: `📢 ${title}`,
            html,
            type: 'ADMIN_BROADCAST',
            metadata: { title, senderName }
        });
    }

    // ===================================
    // BULK OPERATIONS
    // ===================================

    /**
     * Send emails to multiple recipients with rate limiting
     */
    async sendBulkEmails(
        recipients: Array<{ email: string; userId?: string }>,
        emailBuilder: (email: string) => EmailOptions,
        rateLimit: number = 10 // emails per second
    ): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;
        const delayBetween = 1000 / rateLimit;

        for (const recipient of recipients) {
            const options = emailBuilder(recipient.email);
            const success = await this.sendEmail(options);
            if (success) {
                sent++;
            } else {
                failed++;
            }
            await this.delay(delayBetween);
        }

        return { sent, failed };
    }

    // ===================================
    // EMAIL LOGS
    // ===================================

    async getEmailLogs(options: {
        page?: number;
        limit?: number;
        type?: EmailType;
        status?: EmailStatus;
        to?: string;
    }) {
        const { page = 1, limit = 50, type, status, to } = options;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (to) where.to = { contains: to, mode: 'insensitive' };

        const [logs, total] = await Promise.all([
            prisma.emailLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.emailLog.count({ where })
        ]);

        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getEmailStats() {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [total, sent, failed, last24hCount, last7dCount, last30dCount, byType] = await Promise.all([
            prisma.emailLog.count(),
            prisma.emailLog.count({ where: { status: 'SENT' } }),
            prisma.emailLog.count({ where: { status: 'FAILED' } }),
            prisma.emailLog.count({ where: { createdAt: { gte: last24h } } }),
            prisma.emailLog.count({ where: { createdAt: { gte: last7d } } }),
            prisma.emailLog.count({ where: { createdAt: { gte: last30d } } }),
            prisma.emailLog.groupBy({
                by: ['type'],
                _count: true,
                orderBy: { _count: { type: 'desc' } }
            })
        ]);

        return {
            total,
            sent,
            failed,
            successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
            last24h: last24hCount,
            last7d: last7dCount,
            last30d: last30dCount,
            byType: byType.map(t => ({ type: t.type, count: t._count }))
        };
    }
}

export const emailService = new EmailService();
