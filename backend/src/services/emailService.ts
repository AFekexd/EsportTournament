import "dotenv/config";
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import prisma from '../lib/prisma.js';
import { EmailStatus, EmailType } from '../generated/prisma/client.js';
import * as templates from './emailTemplates.js';
import crypto from 'crypto';

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

    private generateUnsubscribeLink(userId: string): string {
        try {
            if (!userId) return '';
            
            const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(userId);
            const signature = hmac.digest('hex');
            
            const baseUrl = process.env.API_URL || 'http://localhost:3000';
            // Use specialized unsubscribe route
            return `${baseUrl}/api/unsubscribe?userId=${userId}&signature=${signature}`;
        } catch (err) {
            console.error('Error generating unsubscribe link:', err);
            return '';
        }
    }

    // ===================================
    // TOURNAMENT EMAILS
    // ===================================

    async sendTournamentInvite(to: string, tournamentName: string, tournamentId: string, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'TOURNAMENT_INVITE'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}`;
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        const html = templates.tournamentInviteTemplate(tournamentName, url);

        return this.sendEmail({
            to,
            subject: `Meghívó: ${tournamentName}`,
            html: templates.generateEmailTemplate({
                title: 'Verseny meghívó',
                preheader: `Meghívtak a ${tournamentName} versenyre!`,
                content: `
                    <p style="margin: 0 0 16px; color: #ffffff;">Meghívtak a következő versenyre:</p>
                    <div style="padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; border-left: 4px solid #8b5cf6; margin-bottom: 16px;">
                        <span style="font-size: 20px; font-weight: 600; color: #8b5cf6;">${tournamentName}</span>
                    </div>
                    <p style="margin: 0; color: #888;">Kattints az alábbi gombra a részletek megtekintéséhez és a regisztrációhoz!</p>
                `,
                button: {
                    text: 'Verseny megtekintése →',
                    url
                },
                unsubscribeUrl
            }),
            type: 'TOURNAMENT_INVITE',
            metadata: { tournamentId, tournamentName }
        });
    }

    async sendNewTournamentNotification(to: string, tournamentName: string, tournamentId: string, startDate?: Date, userId?: string) {
        if (userId && !(await this.shouldSendEmail(userId, 'TOURNAMENT_ANNOUNCEMENT'))) {
            return false;
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}`;
        // const html = templates.newTournamentTemplate(tournamentName, url, startDate || new Date());
        // Using manual construction to inject unsubscribeUrl since templates don't support it yet via wrapper functions
        // Wait, I updated generateEmailTemplate, but the wrapper functions in templates.ts (like newTournamentTemplate)
        // call generateEmailTemplate internally without passing options.
        // I need to update the wrapper functions in emailTemplates.ts too OR manually construct here.
        // Better approach: Update emailTemplates.ts wrapper functions to take optional unsubscribeUrl.
        
        // Actually, let's just update the templates wrapper functions quickly? No, I am already editing this file.
        // I will just reconstruct the call here to include unsubscribeUrl, essentially inlining the template logic or I'll fix templates.ts in next step properly.
        // For now, I will use a direct call to generateEmailTemplate as specific templates are just wrappers.
        
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        const formattedDate = (startDate || new Date()).toLocaleDateString('hu-HU', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        });

        const html = templates.generateEmailTemplate({
            title: 'Új verseny elérhető!',
            preheader: `Új verseny: ${tournamentName}`,
            content: `
                <p style="margin: 0 0 16px; color: #ffffff;">Új verseny lett létrehozva, amire regisztrálhatsz:</p>
                <div style="padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; margin-bottom: 16px;">
                    <p style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #8b5cf6;">${tournamentName}</p>
                    <p style="margin: 0; font-size: 14px; color: #888;">
                        📅 Kezdés: <span style="color: #fff;">${formattedDate}</span>
                    </p>
                </div>
                <p style="margin: 0; color: #888;">Ne maradj le, regisztrálj most!</p>
            `,
            button: {
                text: 'Regisztráció →',
                url
            },
            unsubscribeUrl
        });

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
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const formattedDate = matchDetails.scheduledAt.toLocaleDateString('hu-HU', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest'
        });

        const html = templates.generateEmailTemplate({
            title: 'Meccs emlékeztető',
            preheader: `Közelgő meccsed ${matchDetails.opponent} ellen`,
            content: `
                <p style="margin: 0 0 16px; color: #ffffff;">A következő meccsed hamarosan kezdődik:</p>
                <div style="padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%); border-radius: 12px; margin-bottom: 16px;">
                    <p style="margin: 0 0 12px; font-size: 14px; color: #888;">Verseny</p>
                    <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #fff;">${matchDetails.tournament}</p>
                    
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="flex: 1; text-align: center;">
                            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Ellenfél</p>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ec4899;">${matchDetails.opponent}</p>
                        </div>
                        <div style="flex: 1; text-align: center;">
                            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Időpont</p>
                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #fff;">${formattedDate}</p>
                        </div>
                    </div>
                </div>
                <p style="margin: 0; color: #888;">Készülj fel és sok sikert! 🎮</p>
            `,
            button: {
                text: 'Meccs részletei →',
                url
            },
            unsubscribeUrl
        });

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
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const emoji = result.won ? '🏆' : '💪';
        const statusColor = result.won ? '#22c55e' : '#ef4444';
        const statusText = result.won ? 'Győzelem!' : 'Vereség';

        const html = templates.generateEmailTemplate({
            title: result.won ? '🏆 Győzelem!' : 'Meccs eredmény',
            preheader: `${statusText} - ${result.score}`,
            content: `
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 80px; height: 80px; line-height: 80px; font-size: 40px; background: ${result.won ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border-radius: 50%; border: 2px solid ${statusColor};">
                        ${emoji}
                    </div>
                </div>
                <h2 style="margin: 0 0 16px; font-size: 32px; font-weight: 700; color: ${statusColor}; text-align: center;">
                    ${statusText}
                </h2>
                <div style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; text-align: center; margin-bottom: 16px;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #888;">${result.tournament}</p>
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #fff;">${result.score}</p>
                </div>
                <p style="margin: 0; color: #888; text-align: center;">
                    ${result.won ? 'Gratulálunk a győzelemhez!' : 'Következőre több szerencsét!'}
                </p>
            `,
            button: {
                text: 'Verseny állás →',
                url
            },
            unsubscribeUrl
        });

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

        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        // bookingConfirmationTemplate doesn't support options object yet, reusing manual construction approach or I should really have updated templates.
        // To save tokens and time I'm reconstructing here using generateEmailTemplate directly, mirroring the template function.
        
        const html = templates.generateEmailTemplate({
            title: 'Foglalás megerősítve',
            preheader: `Sikeres foglalás: ${booking.computerName} - ${booking.date} ${booking.startTime}`,
            content: `
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: rgba(34, 197, 94, 0.2); border-radius: 50%; border: 2px solid #22c55e;">
                        ✅
                    </div>
                </div>
                <p style="margin: 0 0 16px; color: #ffffff; text-align: center;">A foglalásodat sikeresen rögzítettük!</p>
                
                <div style="padding: 20px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; margin-bottom: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 14px;">🖥️ Gép:</td>
                            <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${booking.computerName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 14px;">📅 Dátum:</td>
                            <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${booking.date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #888; font-size: 14px;">⏰ Időpont:</td>
                            <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${booking.startTime} - ${booking.endTime}</td>
                        </tr>
                    </table>
                </div>
                
                <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
                    ⚠️ Kérjük, érkezz időben! A foglalás automatikusan törlődik, ha 15 perccel a kezdés után nem jelentkezel be.
                </p>
            `,
            unsubscribeUrl
        });

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

        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const html = templates.generateEmailTemplate({
            title: 'Foglalás emlékeztető',
            preheader: `A foglalásod 30 perc múlva kezdődik!`,
            content: `
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: rgba(251, 191, 36, 0.2); border-radius: 50%; border: 2px solid #fbbf24;">
                        ⏰
                    </div>
                </div>
                <p style="margin: 0 0 16px; color: #ffffff; text-align: center;">A foglalásod hamarosan kezdődik!</p>
                
                <div style="padding: 20px; background: rgba(251, 191, 36, 0.1); border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 14px; color: #888;">30 perc múlva</p>
                    <p style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #fff;">${computerName}</p>
                    <p style="margin: 0; font-size: 18px; color: #fbbf24;">${startTime}</p>
                </div>
                
                <p style="margin: 0; color: #888; text-align: center;">
                    Ne felejtsd el időben bejelentkezni! 🎮
                </p>
            `,
            unsubscribeUrl
        });

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

        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const html = templates.generateEmailTemplate({
            title: 'Foglalás törölve',
            preheader: `A foglalásod törölve lett: ${booking.computerName}`,
            content: `
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: rgba(239, 68, 68, 0.2); border-radius: 50%; border: 2px solid #ef4444;">
                        ❌
                    </div>
                </div>
                <p style="margin: 0 0 16px; color: #ffffff; text-align: center;">A következő foglalásod törölve lett:</p>
                
                <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #fff;">${booking.computerName}</p>
                    <p style="margin: 0; font-size: 14px; color: #888;">${booking.date} - ${booking.startTime}</p>
                </div>
                
                ${booking.reason ? `
                <div style="padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #888;">Indoklás: <span style="color: #fff;">${booking.reason}</span></p>
                </div>
                ` : ''}
                
                <p style="margin: 0; color: #888; text-align: center;">
                    Foglalj új időpontot a rendszerben!
                </p>
            `,
            unsubscribeUrl
        });

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
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const html = templates.generateEmailTemplate({
            title: 'Felszabadult hely!',
            preheader: `Szabad lett egy hely: ${computerName}`,
            content: `
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: rgba(34, 197, 94, 0.2); border-radius: 50%; border: 2px solid #22c55e;">
                        🎉
                    </div>
                </div>
                <p style="margin: 0 0 16px; color: #ffffff; text-align: center;">Jó hír! Felszabadult egy gép, amire vártál:</p>
                
                <div style="padding: 20px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); border-radius: 12px; margin-bottom: 16px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #22c55e;">${computerName}</p>
                    <p style="margin: 0; font-size: 16px; color: #fff;">${availableTime}</p>
                </div>
                
                <p style="margin: 0; color: #888; text-align: center;">
                    Siess, mert valaki más is lefoglalhatja!
                </p>
            `,
            button: {
                text: 'Foglalás most →',
                url
            },
            unsubscribeUrl
        });

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

        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        const html = templates.generateEmailTemplate({
            title,
            content: `<p style="margin: 0; color: #fff;">${message}</p>`,
            button: link ? {
                text: 'Megtekintés →',
                url: link
            } : undefined,
            unsubscribeUrl
        });

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
        const unsubscribeUrl = userId ? this.generateUnsubscribeLink(userId) : undefined;
        
        // Manual construction again for digest
        const winRate = stats.totalMatches > 0
        ? Math.round((stats.wins / stats.totalMatches) * 100)
        : 0;
        
        const tournamentsList = upcomingTournaments.length > 0
        ? upcomingTournaments.map(t => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <a href="${t.url}" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">${t.name}</a>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #888; text-align: right;">
                    ${t.startDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', timeZone: 'Europe/Budapest' })}
                </td>
            </tr>
        `).join('')
        : `<tr><td colspan="2" style="padding: 16px; color: #666; text-align: center;">Nincsenek közelgő versenyek</td></tr>`;

        const html = templates.generateEmailTemplate({
            title: `Heti összefoglaló`,
            preheader: `Szia ${userName}! Itt a heti összefoglalód.`,
            content: `
                <p style="margin: 0 0 24px; color: #fff;">Szia <strong>${userName}</strong>! 👋</p>
                <p style="margin: 0 0 24px; color: #888;">Itt a heti összefoglalód az Esport Tournament rendszerből.</p>
                
                <!-- Stats -->
                <h3 style="margin: 0 0 16px; font-size: 16px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px;">📊 Statisztikák</h3>
                <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <div style="flex: 1; padding: 16px; background: rgba(139, 92, 246, 0.1); border-radius: 12px; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #fff;">${stats.totalMatches}</p>
                        <p style="margin: 0; font-size: 12px; color: #888;">Meccs</p>
                    </div>
                    <div style="flex: 1; padding: 16px; background: rgba(34, 197, 94, 0.1); border-radius: 12px; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #22c55e;">${stats.wins}</p>
                        <p style="margin: 0; font-size: 12px; color: #888;">Győzelem</p>
                    </div>
                    <div style="flex: 1; padding: 16px; background: rgba(251, 191, 36, 0.1); border-radius: 12px; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 24px; font-weight: 700; color: #fbbf24;">${winRate}%</p>
                        <p style="margin: 0; font-size: 12px; color: #888;">Win Rate</p>
                    </div>
                </div>
                
                <!-- Upcoming Tournaments -->
                <h3 style="margin: 0 0 16px; font-size: 16px; color: #8b5cf6; text-transform: uppercase; letter-spacing: 1px;">🏆 Közelgő versenyek</h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: rgba(255,255,255,0.02); border-radius: 12px; margin-bottom: 24px;">
                    ${tournamentsList}
                </table>
                
                <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
                    Jó játékot kívánunk a hétre! 🎮
                </p>
            `,
            button: {
                text: 'Irány a dashboard →',
                url: dashboardUrl
            },
            footer: 'Ezt az emailt hetente egyszer küldjük. Leiratkozhatsz a Beállításokban.',
            unsubscribeUrl
        });

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
        // Admin broadcasts might benefit from unsubscribe link too if users find them annoying?
        // But usually they are critical. I'll add it but maybe logic in backend will treat it differently.
        // Actually, sendAdminBroadcast doesn't take userId currently.
        // If I want to add unsubscribe link, I need userId.
        // The signature requires userId.
        // If I don't have userId, I can't generate the link.
        // sendAdminBroadcast is likely called in a loop or for a single user where userId might be known by caller but not passed here?
        // It seems sendAdminBroadcast is just a helper.
        // I'll skip it for now as it doesn't take userId and likely is used for critical info.
        
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
    // TIME BALANCE EMAIL
    // ===================================

    async sendTimeBalanceUpdate(
        to: string, 
        userName: string, 
        amount: number, 
        newBalance: number, 
        reason: string, 
        userId?: string
    ) {
        if (userId && !(await this.shouldSendEmail(userId, 'SYSTEM'))) {
            return false;
        }

        const isPositive = amount >= 0;
        const title = isPositive ? 'Idő jóváírás' : 'Idő levonás';
        const html = templates.timeBalanceUpdateTemplate(userName, amount, newBalance, reason);

        return this.sendEmail({
            to,
            subject: `${title}`,
            html,
            type: 'SYSTEM',
            metadata: { userName, amount, newBalance, reason }
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
