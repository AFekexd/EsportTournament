import "dotenv/config";
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
}

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

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!this.enabled || !this.transporter) {
            console.log('Email not sent (service disabled):', options.subject);
            return false;
        }

        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
            console.log(`✉️  Email sent to ${options.to}: ${options.subject}`);
            return true;
        } catch (error) {
            console.error('Failed to send email:', error);
            return false;
        }
    }

    // Template methods
    async sendTournamentInvite(to: string, tournamentName: string, tournamentId: string) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">Verseny meghívó</h2>
                <p>Meghívtak a következő versenyre: <strong>${tournamentName}</strong></p>
                <p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}" 
                       style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px;">
                        Verseny megtekintése
                    </a>
                </p>
            </div>
        `;
        return this.sendEmail({
            to,
            subject: `Meghívó: ${tournamentName}`,
            html,
        });
    }

    async sendMatchReminder(to: string, matchDetails: { tournament: string; opponent: string; scheduledAt: Date }) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">Meccs emlékeztető</h2>
                <p>Közelgő meccsed: <strong>${matchDetails.tournament}</strong></p>
                <p>Ellenfél: <strong>${matchDetails.opponent}</strong></p>
                <p>Időpont: <strong>${matchDetails.scheduledAt.toLocaleString('hu-HU')}</strong></p>
            </div>
        `;
        return this.sendEmail({
            to,
            subject: `Meccs emlékeztető - ${matchDetails.tournament}`,
            html,
        });
    }

    async sendMatchResult(to: string, result: { tournament: string; won: boolean; score: string }) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: ${result.won ? '#22c55e' : '#ef4444'};">
                    ${result.won ? '🏆 Győzelem!' : '😔 Vereség'}
                </h2>
                <p>Verseny: <strong>${result.tournament}</strong></p>
                <p>Eredmény: <strong>${result.score}</strong></p>
            </div>
        `;
        return this.sendEmail({
            to,
            subject: `Meccs eredmény - ${result.tournament}`,
            html,
        });
    }

    async sendSystemNotification(to: string, title: string, message: string) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">${title}</h2>
                <p>${message}</p>
            </div>
        `;
        return this.sendEmail({
            to,
            subject: title,
            html,
        });
    }

    async sendNewTournamentNotification(to: string, tournamentName: string, tournamentId: string) {
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8b5cf6;">Új verseny elérhető!</h2>
                <p>Nézd meg a legújabb versenyt: <strong>${tournamentName}</strong></p>
                <p>
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/tournaments/${tournamentId}" 
                       style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 8px;">
                        Verseny megtekintése
                    </a>
                </p>
            </div>
        `;
        return this.sendEmail({
            to,
            subject: `Új verseny: ${tournamentName}`,
            html,
        });
    }
}

export const emailService = new EmailService();
