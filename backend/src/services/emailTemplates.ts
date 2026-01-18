/**
 * Email HTML Templates Service
 * Provides consistent, responsive, and branded email templates
 */

interface ButtonParams {
    text: string;
    url: string;
}

interface EmailTemplateOptions {
    title: string;
    preheader?: string;
    content: string;
    button?: ButtonParams;
    footer?: string;
}

/**
 * Base email template with consistent branding
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
    const { title, preheader, content, button, footer } = options;
    
    const buttonHtml = button ? `
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
                <td style="border-radius: 8px; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);">
                    <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                        ${button.text}
                    </a>
                </td>
            </tr>
        </table>
    ` : '';

    return `
<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 16px !important; }
            .content { padding: 24px !important; }
        }
        @media (prefers-color-scheme: dark) {
            body { background-color: #0a0a0f !important; }
            .container { background-color: #111118 !important; }
            .content { background-color: #1a1a24 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
    
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0f;">
        <tr>
            <td align="center" style="padding: 40px 16px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="container" style="max-width: 600px; width: 100%; background-color: #111118; border-radius: 16px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.2);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 0; text-align: center;">
                            <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%); border-radius: 50px; border: 1px solid rgba(139, 92, 246, 0.3);">
                                <span style="font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                    🎮 Esport Tournament
                                </span>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 32px;">
                            <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                                ${title}
                            </h1>
                            <div style="color: #a0a0a0; font-size: 16px; line-height: 1.6;">
                                ${content}
                            </div>
                            ${buttonHtml}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px 32px; border-top: 1px solid rgba(255,255,255,0.05);">
                            <p style="margin: 0; font-size: 13px; color: #666; text-align: center;">
                                ${footer || 'Ez egy automatikus üzenet. Kérjük, ne válaszolj erre az emailre.'}
                            </p>
                            <p style="margin: 12px 0 0; font-size: 12px; color: #444; text-align: center;">
                                © ${new Date().getFullYear()} Esport Tournament System
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// ===================================
// TOURNAMENT TEMPLATES
// ===================================

export function tournamentInviteTemplate(tournamentName: string, tournamentUrl: string): string {
    return generateEmailTemplate({
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
            url: tournamentUrl
        }
    });
}

export function newTournamentTemplate(tournamentName: string, tournamentUrl: string, startDate: Date): string {
    const formattedDate = startDate.toLocaleDateString('hu-HU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return generateEmailTemplate({
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
            url: tournamentUrl
        }
    });
}

// ===================================
// MATCH TEMPLATES
// ===================================

export function matchReminderTemplate(tournamentName: string, opponent: string, scheduledAt: Date, matchUrl: string): string {
    const formattedDate = scheduledAt.toLocaleDateString('hu-HU', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return generateEmailTemplate({
        title: 'Meccs emlékeztető',
        preheader: `Közelgő meccsed ${opponent} ellen`,
        content: `
            <p style="margin: 0 0 16px; color: #ffffff;">A következő meccsed hamarosan kezdődik:</p>
            <div style="padding: 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%); border-radius: 12px; margin-bottom: 16px;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #888;">Verseny</p>
                <p style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #fff;">${tournamentName}</p>
                
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="flex: 1; text-align: center;">
                        <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Ellenfél</p>
                        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ec4899;">${opponent}</p>
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
            url: matchUrl
        }
    });
}

export function matchResultTemplate(tournamentName: string, won: boolean, score: string, tournamentUrl: string): string {
    const emoji = won ? '🏆' : '💪';
    const statusColor = won ? '#22c55e' : '#ef4444';
    const statusText = won ? 'Győzelem!' : 'Vereség';

    return generateEmailTemplate({
        title: won ? '🏆 Győzelem!' : 'Meccs eredmény',
        preheader: `${statusText} - ${score}`,
        content: `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 80px; height: 80px; line-height: 80px; font-size: 40px; background: ${won ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border-radius: 50%; border: 2px solid ${statusColor};">
                    ${emoji}
                </div>
            </div>
            <h2 style="margin: 0 0 16px; font-size: 32px; font-weight: 700; color: ${statusColor}; text-align: center;">
                ${statusText}
            </h2>
            <div style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; text-align: center; margin-bottom: 16px;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #888;">${tournamentName}</p>
                <p style="margin: 0; font-size: 28px; font-weight: 700; color: #fff;">${score}</p>
            </div>
            <p style="margin: 0; color: #888; text-align: center;">
                ${won ? 'Gratulálunk a győzelemhez!' : 'Következőre több szerencsét!'}
            </p>
        `,
        button: {
            text: 'Verseny állás →',
            url: tournamentUrl
        }
    });
}

// ===================================
// BOOKING TEMPLATES
// ===================================

export function bookingConfirmationTemplate(computerName: string, date: string, startTime: string, endTime: string, qrCode?: string): string {
    return generateEmailTemplate({
        title: 'Foglalás megerősítve',
        preheader: `Sikeres foglalás: ${computerName} - ${date} ${startTime}`,
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
                        <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${computerName}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #888; font-size: 14px;">📅 Dátum:</td>
                        <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #888; font-size: 14px;">⏰ Időpont:</td>
                        <td style="padding: 8px 0; color: #fff; font-weight: 600; text-align: right;">${startTime} - ${endTime}</td>
                    </tr>
                </table>
            </div>
            
            ${qrCode ? `
            <div style="text-align: center; margin-bottom: 16px;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #888;">QR kód a bejelentkezéshez:</p>
                <p style="margin: 0; font-family: monospace; font-size: 18px; color: #8b5cf6; letter-spacing: 2px;">${qrCode}</p>
            </div>
            ` : ''}
            
            <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
                ⚠️ Kérjük, érkezz időben! A foglalás automatikusan törlődik, ha 15 perccel a kezdés után nem jelentkezel be.
            </p>
        `
    });
}

export function bookingReminderTemplate(computerName: string, startTime: string): string {
    return generateEmailTemplate({
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
        `
    });
}

export function bookingCancelledTemplate(computerName: string, date: string, startTime: string, reason?: string): string {
    return generateEmailTemplate({
        title: 'Foglalás törölve',
        preheader: `A foglalásod törölve lett: ${computerName}`,
        content: `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: rgba(239, 68, 68, 0.2); border-radius: 50%; border: 2px solid #ef4444;">
                    ❌
                </div>
            </div>
            <p style="margin: 0 0 16px; color: #ffffff; text-align: center;">A következő foglalásod törölve lett:</p>
            
            <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; margin-bottom: 16px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #fff;">${computerName}</p>
                <p style="margin: 0; font-size: 14px; color: #888;">${date} - ${startTime}</p>
            </div>
            
            ${reason ? `
            <div style="padding: 12px 16px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; color: #888;">Indoklás: <span style="color: #fff;">${reason}</span></p>
            </div>
            ` : ''}
            
            <p style="margin: 0; color: #888; text-align: center;">
                Foglalj új időpontot a rendszerben!
            </p>
        `
    });
}

export function waitlistNotificationTemplate(computerName: string, availableTime: string, bookingUrl: string): string {
    return generateEmailTemplate({
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
            url: bookingUrl
        }
    });
}

// ===================================
// SYSTEM TEMPLATES
// ===================================

export function systemNotificationTemplate(title: string, message: string, link?: string): string {
    return generateEmailTemplate({
        title,
        content: `<p style="margin: 0; color: #fff;">${message}</p>`,
        button: link ? {
            text: 'Megtekintés →',
            url: link
        } : undefined
    });
}

// ===================================
// DIGEST TEMPLATE
// ===================================

interface DigestTournament {
    name: string;
    startDate: Date;
    url: string;
}

interface DigestStats {
    totalMatches: number;
    wins: number;
    losses: number;
}

export function weeklyDigestTemplate(
    userName: string,
    upcomingTournaments: DigestTournament[],
    stats: DigestStats,
    dashboardUrl: string
): string {
    const tournamentsList = upcomingTournaments.length > 0
        ? upcomingTournaments.map(t => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <a href="${t.url}" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">${t.name}</a>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #888; text-align: right;">
                    ${t.startDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                </td>
            </tr>
        `).join('')
        : `<tr><td colspan="2" style="padding: 16px; color: #666; text-align: center;">Nincsenek közelgő versenyek</td></tr>`;

    const winRate = stats.totalMatches > 0 
        ? Math.round((stats.wins / stats.totalMatches) * 100) 
        : 0;

    return generateEmailTemplate({
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
        footer: 'Ezt az emailt hetente egyszer küldjük. Leiratkozhatsz a Beállításokban.'
    });
}

// ===================================
// ADMIN BROADCAST TEMPLATE
// ===================================

export function announcementTemplate(title: string, message: string, senderName: string): string {
    return generateEmailTemplate({
        title,
        content: `
            <div style="padding: 16px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid #3b82f6; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px;">📢 Hirdetmény</p>
            </div>
            <div style="color: #fff; line-height: 1.8; font-size: 16px;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="margin: 24px 0 0; font-size: 13px; color: #666; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                Küldte: <strong style="color: #fff;">${senderName}</strong> | EsportHub Admin
            </p>
        `,
        footer: 'Ezt az üzenetet az EsportHub adminisztrátora küldte.'
    });
}

export function adminBroadcastTemplate(title: string, message: string, senderName: string): string {
    return generateEmailTemplate({
        title,
        content: `
            <div style="padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: 12px; border-left: 4px solid #ef4444; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 12px; color: #ef4444; text-transform: uppercase; letter-spacing: 1px;">📢 Admin üzenet</p>
            </div>
            <div style="color: #fff; line-height: 1.8;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="margin: 24px 0 0; font-size: 13px; color: #666;">
                Küldő: ${senderName}
            </p>
        `,
        footer: 'Ez egy adminisztrátori közlemény.'
    });
}
