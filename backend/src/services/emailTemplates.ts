/**
 * Email HTML Templates Service
 * Provides consistent, responsive, bulletproof, and esports-branded dark tactical email templates.
 */

export interface ButtonParams {
    text: string;
    url: string;
}

export interface EmailTemplateOptions {
    title: string;
    preheader?: string;
    content: string;
    button?: ButtonParams;
    footer?: string;
    unsubscribeUrl?: string;
    badgeText?: string;
    badgeColor?: string; // 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple'
}

/**
 * Base email template with modern Pollák Esport tactical branding
 */
export function generateEmailTemplate(options: EmailTemplateOptions): string {
    const {
        title,
        preheader,
        content,
        button,
        footer,
        unsubscribeUrl,
        badgeText = 'POLLÁK ESPORT // LABOR',
        badgeColor = 'cyan'
    } = options;

    const badgeBorderColor = 
        badgeColor === 'emerald' ? '#10B981' :
        badgeColor === 'amber' ? '#F59E0B' :
        badgeColor === 'rose' ? '#EF4444' :
        badgeColor === 'purple' ? '#A855F7' : '#06B6D4';

    const buttonHtml = button ? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 12px;">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                            <td align="center" style="border-radius: 8px; background-color: #06B6D4; background: linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%);">
                                <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #020617; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px; text-transform: uppercase;">
                                    ${button.text}
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    ` : '';

    const unsubscribeHtml = unsubscribeUrl ? `
        <p style="margin: 12px 0 0; font-size: 12px; color: #64748B; text-align: center;">
            <a href="${unsubscribeUrl}" style="color: #94A3B8; text-decoration: underline;">Értesítési beállítások / Leiratkozás</a>
        </p>
    ` : '';

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="hu">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${title} | Pollák Esport</title>
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        @media only screen and (max-width: 620px) {
            .container { width: 100% !important; max-width: 100% !important; }
            .content-padding { padding: 24px 16px !important; }
            .col-half { width: 100% !important; display: block !important; box-sizing: border-box !important; }
            .col-third { width: 100% !important; display: block !important; margin-bottom: 8px !important; box-sizing: border-box !important; }
            .hero-title { font-size: 22px !important; line-height: 28px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #080B11; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
    ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #080B11;">${preheader}</div>` : ''}

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #080B11; width: 100%;">
        <tr>
            <td align="center" style="padding: 32px 12px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="container" style="max-width: 580px; width: 100%; margin: 0 auto;">
                    
                    <!-- Top Status Bar -->
                    <tr>
                        <td align="center" style="padding-bottom: 16px;">
                            <table border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="background-color: #0F1626; border: 1px solid ${badgeBorderColor}40; border-radius: 9999px; padding: 6px 16px; text-align: center;">
                                        <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; color: ${badgeBorderColor}; letter-spacing: 1.5px; text-transform: uppercase;">
                                            ⚡ ${badgeText}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Main Tactical Card Container -->
                    <tr>
                        <td style="background-color: #0E1422; border-radius: 14px; border: 1px solid #1E293B; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);">
                            
                            <!-- Neon Accent Strip -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td height="3" style="background: linear-gradient(90deg, #06B6D4 0%, #3B82F6 50%, #8B5CF6 100%); line-height: 3px; font-size: 3px;">&nbsp;</td>
                                </tr>
                            </table>

                            <!-- Main Content -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td class="content-padding" style="padding: 32px 28px;">
                                        
                                        <!-- Header Title -->
                                        <h1 class="hero-title" style="margin: 0 0 20px; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.3; text-transform: uppercase;">
                                            ${title}
                                        </h1>

                                        <!-- Dynamic Body Content -->
                                        <div style="color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                                            ${content}
                                        </div>

                                        <!-- Bulletproof Button -->
                                        ${buttonHtml}

                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 16px 0; text-align: center;">
                            <p style="margin: 0 0 6px; font-size: 13px; color: #94A3B8; font-weight: 600;">
                                Pollák Antal Technikum • Esport Labor & Bajnokság
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #64748B;">
                                ${footer || 'Ez egy automatikus rendszerüzenet. Kérjük, ne válaszolj erre az emailre.'}
                            </p>
                            <p style="margin: 12px 0 0; font-size: 11px; color: #475569; font-family: 'Courier New', Courier, monospace;">
                                © ${new Date().getFullYear()} POLLÁK ESPORT. MINDEN JOG FENNTARTVA.
                            </p>
                            ${unsubscribeHtml}
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

export function tournamentInviteTemplate(tournamentName: string, tournamentUrl: string, unsubscribeUrl?: string): string {
    return generateEmailTemplate({
        title: 'Verseny Meghívó',
        badgeText: 'ESPORT VERSENY // MEGHÍVÓ',
        badgeColor: 'purple',
        preheader: `Meghívtak a(z) ${tournamentName} esport versenyre!`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                Hivatalos meghívást kaptál a Pollák Esport Labor következő versenyére:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #8B5CF6; border-left: 4px solid #8B5CF6; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 16px 18px;">
                        <span style="font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #A78BFA; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; display: block; margin-bottom: 4px;">Verseny neve</span>
                        <span style="font-size: 20px; font-weight: 800; color: #FFFFFF; display: block;">${tournamentName}</span>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 14px;">
                A regisztrációhoz és a szabályzat megtekintéséhez kattints az alábbi gombra:
            </p>
        `,
        button: {
            text: 'Verseny megtekintése →',
            url: tournamentUrl
        },
        unsubscribeUrl
    });
}

export function newTournamentTemplate(tournamentName: string, tournamentUrl: string, startDate: Date, unsubscribeUrl?: string): string {
    const formattedDate = startDate.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Budapest'
    });

    return generateEmailTemplate({
        title: 'Új Esport Verseny Indul!',
        badgeText: 'ESPORT // ÚJ KIÍRÁS',
        badgeColor: 'cyan',
        preheader: `Új verseny indult: ${tournamentName} (${formattedDate})`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                Új esport bajnokság nyílt meg a Pollák laborban, amelyre már megnyílt a jelentkezés:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-left: 4px solid #06B6D4; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 18px 20px;">
                        <span style="font-size: 20px; font-weight: 800; color: #06B6D4; display: block; margin-bottom: 8px;">${tournamentName}</span>
                        <table border="0" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px;">📅 Kezdés időpontja:</td>
                                <td style="color: #FFFFFF; font-size: 13px; font-weight: 700; padding-left: 8px;">${formattedDate}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 14px;">
                A helyek száma korlátozott! Csatlakozz a csapattársaiddal vagy szólóban még ma:
            </p>
        `,
        button: {
            text: 'Nevezés a versenyre →',
            url: tournamentUrl
        },
        unsubscribeUrl
    });
}

// ===================================
// MATCH TEMPLATES
// ===================================

export function matchReminderTemplate(tournamentName: string, opponent: string, scheduledAt: Date, matchUrl: string, unsubscribeUrl?: string): string {
    const formattedDate = scheduledAt.toLocaleDateString('hu-HU', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Budapest'
    });

    return generateEmailTemplate({
        title: 'Meccs Emlékeztető',
        badgeText: 'ESPORT // KÖZELGŐ MECCS',
        badgeColor: 'amber',
        preheader: `Hamarosan kezdődik a meccsed: ${tournamentName} vs ${opponent}`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                A versenymérkőzésed hamarosan kezdődik a Pollák Esport laborban:
            </p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 16px 20px; border-bottom: 1px solid #1E293B;">
                        <span style="font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Verseny</span>
                        <div style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin-top: 2px;">${tournamentName}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 16px 20px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td width="50%" class="col-half" style="vertical-align: top; padding-right: 8px;">
                                    <span style="font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Ellenfél</span>
                                    <div style="font-size: 16px; font-weight: 700; color: #F43F5E; margin-top: 2px;">${opponent}</div>
                                </td>
                                <td width="50%" class="col-half" style="vertical-align: top; padding-left: 8px;">
                                    <span style="font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Kezdés</span>
                                    <div style="font-size: 16px; font-weight: 700; color: #F59E0B; margin-top: 2px;">${formattedDate}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 13px;">
                Kérjük, ellenőrizd a meccs lobbyt és a Discord szobát legalább 10 perccel kezdés előtt!
            </p>
        `,
        button: {
            text: 'Meccs megtekintése →',
            url: matchUrl
        },
        unsubscribeUrl
    });
}

export function matchResultTemplate(tournamentName: string, won: boolean, score: string, tournamentUrl: string, unsubscribeUrl?: string): string {
    const statusColor = won ? '#10B981' : '#EF4444';
    const statusText = won ? 'Győzelem!' : 'Vereség';
    const badgeEmoji = won ? '🏆' : '⚔️';

    return generateEmailTemplate({
        title: won ? '🏆 Győzelem!' : 'Meccs Eredmény',
        badgeText: `ESPORT MECCS // ${won ? 'GYŐZELEM' : 'LEZÁRVA'}`,
        badgeColor: won ? 'emerald' : 'rose',
        preheader: `${statusText} a(z) ${tournamentName} versenyen! Végeredmény: ${score}`,
        content: `
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid ${statusColor}40; border-radius: 12px; margin-bottom: 20px; text-align: center;">
                <tr>
                    <td style="padding: 24px 16px;">
                        <div style="font-size: 40px; line-height: 1; margin-bottom: 8px;">${badgeEmoji}</div>
                        <h2 style="margin: 0 0 6px; font-size: 26px; font-weight: 800; color: ${statusColor}; text-transform: uppercase; letter-spacing: 1px;">
                            ${statusText}
                        </h2>
                        <div style="color: #94A3B8; font-size: 13px; margin-bottom: 14px;">${tournamentName}</div>
                        
                        <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                                <td style="background-color: #0E1422; border: 1px solid #1E293B; border-radius: 8px; padding: 10px 24px;">
                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: 2px;">
                                        ${score}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 14px; text-align: center;">
                ${won ? 'Gratulálunk a remek teljesítményhez és a továbbjutáshoz!' : 'Szoros meccs volt, sok sikert a következő fordulóban vagy a vigaszágon!'}
            </p>
        `,
        button: {
            text: 'Bajnokság állás megtekintése →',
            url: tournamentUrl
        },
        unsubscribeUrl
    });
}

// ===================================
// BOOKING TEMPLATES
// ===================================

export function bookingConfirmationTemplate(
    computerName: string,
    date: string,
    startTime: string,
    endTime: string,
    qrCode?: string,
    unsubscribeUrl?: string
): string {
    return generateEmailTemplate({
        title: 'Gépfoglalás Megerősítve',
        badgeText: 'ESPORT LABOR // FOGLALÁS',
        badgeColor: 'emerald',
        preheader: `Sikeres gépfoglalás: ${computerName} (${date} ${startTime}-${endTime})`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                A gépfoglalási igényedet sikeresen rögzítettük és megerősítettük a Pollák Esport laborban:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 10px; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 14px 18px; border-bottom: 1px solid #1E293B;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px; font-family: 'Courier New', Courier, monospace;">🖥️ MUNKAÁLLOMÁS</td>
                                <td align="right" style="color: #10B981; font-size: 15px; font-weight: 700;">${computerName}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 14px 18px; border-bottom: 1px solid #1E293B;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px; font-family: 'Courier New', Courier, monospace;">📅 DÁTUM</td>
                                <td align="right" style="color: #FFFFFF; font-size: 14px; font-weight: 600;">${date}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 14px 18px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px; font-family: 'Courier New', Courier, monospace;">⏰ IDŐSÁV</td>
                                <td align="right" style="color: #06B6D4; font-size: 14px; font-weight: 700;">${startTime} – ${endTime}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #162032; border-left: 3px solid #06B6D4; border-radius: 6px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 12px 14px; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                        💡 <strong>Fontos infó:</strong> A géphez a saját iskolai felhő felhasználóneveddel és jelszavaddal tudsz bejelentkezni. Kérjük, érkezz pontosan!
                    </td>
                </tr>
            </table>
        `,
        unsubscribeUrl
    });
}

export function bookingReminderTemplate(computerName: string, startTime: string, unsubscribeUrl?: string): string {
    return generateEmailTemplate({
        title: 'Foglalás Emlékeztető (30 perc)',
        badgeText: 'ESPORT LABOR // EMLÉKEZTETŐ',
        badgeColor: 'amber',
        preheader: `A gépfoglalásod 30 perc múlva kezdődik a laborban (${computerName})`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                Hamarosan kezdődik a lefoglalt idősávod a Pollák Esport laborban:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #F59E0B40; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                <tr>
                    <td style="padding: 24px 18px;">
                        <span style="font-size: 12px; font-family: 'Courier New', Courier, monospace; color: #F59E0B; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">30 perc múlva</span>
                        <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin: 4px 0 6px;">${computerName}</div>
                        <div style="font-size: 18px; font-weight: 700; color: #38BDF8;">Kezdés: ${startTime}</div>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 13px; text-align: center;">
                Jó játékot és eredményes gyakorlást kívánunk! 🎮
            </p>
        `,
        unsubscribeUrl
    });
}

export function bookingCancelledTemplate(computerName: string, date: string, startTime: string, reason?: string, unsubscribeUrl?: string): string {
    return generateEmailTemplate({
        title: 'Foglalási Kérelem Törölve',
        badgeText: 'ESPORT LABOR // TÖRLÉS',
        badgeColor: 'rose',
        preheader: `A(z) ${computerName} gépre szóló foglalásod törlésre került`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                A(z) <strong>${computerName}</strong> munkaállomásra leadott foglalásod törlésre került a rendszerből:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #EF444440; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 14px 18px;">
                        <div style="font-size: 16px; font-weight: 700; color: #FFFFFF;">${computerName}</div>
                        <div style="font-size: 13px; color: #94A3B8; margin-top: 2px;">${date} • ${startTime}</div>
                    </td>
                </tr>
            </table>
            
            ${reason ? `
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #162032; border-left: 3px solid #EF4444; border-radius: 6px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 12px 14px; font-size: 13px; color: #CBD5E1;">
                        <strong>Indoklás / ok:</strong> ${reason}
                    </td>
                </tr>
            </table>
            ` : ''}

            <p style="margin: 0; color: #94A3B8; font-size: 13px;">
                A kérelem törlésével a heti limitkereted nem csökkent, így szabadon választhatsz egy másik elérhető időpontot a felületen.
            </p>
        `,
        unsubscribeUrl
    });
}

export function waitlistNotificationTemplate(computerName: string, availableTime: string, bookingUrl: string, unsubscribeUrl?: string): string {
    return generateEmailTemplate({
        title: 'Felszabadult Gép a Laborban!',
        badgeText: 'ESPORT LABOR // FELSZABADULT GÉP',
        badgeColor: 'emerald',
        preheader: `Szabad lett a(z) ${computerName} gép a laborban: ${availableTime}`,
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                Jó hír! Egy korábban lefoglalt számítógép megüresedett, amelyre várólistán voltál:
            </p>
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #10B98140; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                <tr>
                    <td style="padding: 20px;">
                        <div style="font-size: 22px; font-weight: 800; color: #10B981; margin-bottom: 4px;">${computerName}</div>
                        <div style="font-size: 15px; font-weight: 600; color: #FFFFFF;">${availableTime}</div>
                    </td>
                </tr>
            </table>

            <p style="margin: 0; color: #94A3B8; font-size: 13px; text-align: center;">
                Kattints a foglalás gombra minél előbb, mielőtt más lefoglalná a szabad helyet!
            </p>
        `,
        button: {
            text: 'Gép lefoglalása most →',
            url: bookingUrl
        },
        unsubscribeUrl
    });
}

// ===================================
// SYSTEM TEMPLATES
// ===================================

export function systemNotificationTemplate(title: string, message: string, link?: string, unsubscribeUrl?: string): string {
    return generateEmailTemplate({
        title,
        badgeText: 'ESPORT // RENDSZERÉRTESÍTÉS',
        badgeColor: 'cyan',
        content: `
            <div style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; padding: 18px 20px; color: #E2E8F0; line-height: 1.6;">
                ${message.replace(/\n/g, '<br>')}
            </div>
        `,
        button: link ? {
            text: 'Megtekintés az oldalon →',
            url: link
        } : undefined,
        unsubscribeUrl
    });
}

// ===================================
// DIGEST TEMPLATE
// ===================================

export interface DigestTournament {
    name: string;
    startDate: Date;
    url: string;
}

export interface DigestStats {
    totalMatches: number;
    wins: number;
    losses: number;
}

export function weeklyDigestTemplate(
    userName: string,
    upcomingTournaments: DigestTournament[],
    stats: DigestStats,
    dashboardUrl: string,
    unsubscribeUrl?: string
): string {
    const winRate = stats.totalMatches > 0
        ? Math.round((stats.wins / stats.totalMatches) * 100)
        : 0;

    const tournamentsList = upcomingTournaments.length > 0
        ? upcomingTournaments.map(t => `
            <tr>
                <td style="padding: 12px 14px; border-bottom: 1px solid #1E293B;">
                    <a href="${t.url}" style="color: #38BDF8; text-decoration: none; font-weight: 700; font-size: 14px;">${t.name}</a>
                </td>
                <td align="right" style="padding: 12px 14px; border-bottom: 1px solid #1E293B; color: #94A3B8; font-size: 13px;">
                    ${t.startDate.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', timeZone: 'Europe/Budapest' })}
                </td>
            </tr>
        `).join('')
        : `<tr><td colspan="2" style="padding: 16px; color: #64748B; text-align: center; font-size: 13px;">Nincsenek aktív versenyek erre a hétre</td></tr>`;

    return generateEmailTemplate({
        title: 'Heti Esport Összefoglaló',
        badgeText: 'ESPORT // HETI JELENTÉS',
        badgeColor: 'purple',
        preheader: `Szia ${userName}! Itt a heti összefoglalód az Esport Laborból.`,
        content: `
            <p style="margin: 0 0 20px; color: #E2E8F0;">
                Szia <strong>${userName}</strong>! 👋 Íme a heti összefoglalód a Pollák Esport bajnokságokról és statisztikáidról:
            </p>

            <!-- Table-based 3-column stats -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                    <td width="32%" class="col-third" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; padding: 14px 8px; text-align: center;">
                        <span style="font-size: 10px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Összes meccs</span>
                        <div style="font-size: 22px; font-weight: 800; color: #FFFFFF; margin-top: 2px;">${stats.totalMatches}</div>
                    </td>
                    <td width="2%">&nbsp;</td>
                    <td width="32%" class="col-third" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; padding: 14px 8px; text-align: center;">
                        <span style="font-size: 10px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Győzelmek</span>
                        <div style="font-size: 22px; font-weight: 800; color: #10B981; margin-top: 2px;">${stats.wins}</div>
                    </td>
                    <td width="2%">&nbsp;</td>
                    <td width="32%" class="col-third" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; padding: 14px 8px; text-align: center;">
                        <span style="font-size: 10px; font-family: 'Courier New', Courier, monospace; color: #94A3B8; text-transform: uppercase;">Win Rate</span>
                        <div style="font-size: 22px; font-weight: 800; color: #F59E0B; margin-top: 2px;">${winRate}%</div>
                    </td>
                </tr>
            </table>

            <h3 style="margin: 0 0 10px; font-size: 13px; font-family: 'Courier New', Courier, monospace; color: #38BDF8; text-transform: uppercase; letter-spacing: 1px;">
                🏆 Közelgő Bajnokságok
            </h3>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 20px;">
                ${tournamentsList}
            </table>
        `,
        button: {
            text: 'Irány a vezérlőpult →',
            url: dashboardUrl
        },
        unsubscribeUrl
    });
}

// ===================================
// ADMIN BROADCAST TEMPLATE
// ===================================

export function announcementTemplate(title: string, message: string, senderName: string): string {
    return generateEmailTemplate({
        title,
        badgeText: 'ESPORT // HIVATALOS HIRDETMÉNY',
        badgeColor: 'cyan',
        content: `
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-left: 4px solid #06B6D4; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 16px 20px; color: #F8FAFC; line-height: 1.7; font-size: 15px;">
                        ${message.replace(/\n/g, '<br>')}
                    </td>
                </tr>
            </table>
            <p style="margin: 0; font-size: 13px; color: #94A3B8;">
                Küldte: <strong style="color: #FFFFFF;">${senderName}</strong> • Pollák Esport Vezetőség
            </p>
        `,
        footer: 'Hivatalos rendszerhirdetmény minden regisztrált felhasználónak.'
    });
}

export function adminBroadcastTemplate(title: string, message: string, senderName: string): string {
    return announcementTemplate(title, message, senderName);
}

// ===================================
// TIME BALANCE TEMPLATE
// ===================================

export function timeBalanceUpdateTemplate(userName: string, amount: number, newBalance: number, reason: string): string {
    const isPositive = amount >= 0;
    const color = isPositive ? '#10B981' : '#EF4444';
    const title = isPositive ? 'Időkeret Jóváírás' : 'Időkeret Levonás';
    
    const formatTime = (seconds: number) => {
        const absSeconds = Math.abs(seconds);
        const hours = Math.floor(absSeconds / 3600);
        const minutes = Math.floor((absSeconds % 3600) / 60);
        
        let text = '';
        if (hours > 0) text += `${hours} óra `;
        if (minutes > 0 || hours === 0) text += `${minutes} perc`;
        return text.trim();
    };

    const amountText = `${isPositive ? '+' : '-'}${formatTime(amount)}`;
    const balanceText = formatTime(newBalance);

    return generateEmailTemplate({
        title,
        badgeText: 'ESPORT LABOR // IDŐEGYENLEG',
        badgeColor: isPositive ? 'emerald' : 'rose',
        content: `
            <p style="margin: 0 0 16px; color: #E2E8F0;">
                Szia <strong>${userName}</strong>! Időkeret tranzakció történt a fiókodon a laborban:
            </p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #141B2D; border: 1px solid #1E293B; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                    <td style="padding: 14px 18px; border-bottom: 1px solid #1E293B;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px;">Változás:</td>
                                <td align="right" style="color: ${color}; font-size: 16px; font-weight: 800;">${amountText}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 14px 18px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="color: #94A3B8; font-size: 13px;">Új egyenleged:</td>
                                <td align="right" style="color: #FFFFFF; font-size: 16px; font-weight: 800;">${balanceText}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #162032; border-left: 3px solid #06B6D4; border-radius: 6px;">
                <tr>
                    <td style="padding: 12px 14px; font-size: 13px; color: #CBD5E1;">
                        <strong>Indoklás:</strong> "${reason}"
                    </td>
                </tr>
            </table>
        `
    });
}
