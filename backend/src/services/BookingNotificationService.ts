import prisma from '../lib/prisma.js';
import nodemailer from 'nodemailer';


export class BookingNotificationService {
    // 30 perc
    private static REMINDER_TIME_MS = 30 * 60 * 1000;

    static async createNotification(userId: string, type: NotificationType, message: string) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    type,
                    message,
                },
            });

            // Itt lehetne emailt is küldeni
            // console.log(`[Notification Created] User: ${userId}, Type: ${type}, Message: ${message}`);
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    static async createdBooking(booking: any) {
        const message = `Sikeres foglalás! Gép: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU')}`;
        await this.createNotification(booking.userId, 'BOOKING_CONFIRMED', message);
    }

    static async startReminderJob() {
        console.log('Starting Booking Reminder Job...');

        setInterval(async () => {
            try {
                const now = new Date();
                const reminderThreshold = new Date(now.getTime() + this.REMINDER_TIME_MS);

                // Keressük azokat a foglalásokat, amik hamarosan kezdődnek és még nem kaptak emlékeztetőt
                const upcomingBookings = await prisma.booking.findMany({
                    where: {
                        startTime: {
                            gte: now,
                            lte: reminderThreshold
                        },
                        reminderSent: false,
                        status: 'CONFIRMED'
                    },
                    include: {
                        computer: true,
                        user: true
                    }
                });

                for (const booking of upcomingBookings) {
                    const message = `Emlékeztető: A foglalásod hamarosan kezdődik! (${booking.computer.name} - ${new Date(booking.startTime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })})`;

                    await this.createNotification(booking.userId, 'BOOKING_REMINDER', message);

                    // Update reminderSent flag
                    await prisma.booking.update({
                        where: { id: booking.id },
                        data: { reminderSent: true }
                    });

                    console.log(`Reminder sent for booking ${booking.id}`);
                }
            } catch (error) {
                console.error('Error in reminder job:', error);
            }
        }, 60000); // Percenként fut
    }

    static async checkWaitlist(computerId: string, startTime: Date, endTime: Date) {
        try {
            // Keressük azokat a várólistásokat, akik erre a gépre és időpontra (vagy átfedésben) várnak
            const waitlistEntries = await prisma.waitlist.findMany({
                where: {
                    computerId,
                    // Egyelőre egyszerűsített logika: ha a dátum egyezik
                    // A pontos időpont egyezést nehezebb szűrni SQL szinten az átfedések miatt
                    // Ezért lekérjük a napi várólistát és JS-ben szűrünk
                    date: {
                        gte: new Date(startTime.setHours(0, 0, 0, 0)),
                        lt: new Date(startTime.setHours(24, 0, 0, 0))
                    }
                },
                include: {
                    user: true,
                    computer: true
                }
            });

            for (const entry of waitlistEntries) {
                // Ellenőrizzük az átfedést
                // waitlist entry-ben csak startHour és endHour van
                const entryStart = new Date(entry.date);
                entryStart.setHours(entry.startHour, 0, 0, 0);
                const entryEnd = new Date(entry.date);
                entryEnd.setHours(entry.endHour, 0, 0, 0);

                // A felszabadult időpont
                const freeStart = new Date(startTime);
                const freeEnd = new Date(endTime);

                // Ha van átfedés a felszabadult idő és a várt idő között
                if (entryStart < freeEnd && entryEnd > freeStart) {
                    const message = `Jó hír! Felszabadult egy gép, amire vártál: ${entry.computer.name} (${entryStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

                    await this.createNotification(entry.userId, 'WAITLIST_AVAILABLE', message);

                    // Opcionálisan törölhetjük a várólistáról, vagy hagyhatjuk amíg nem foglal
                    // Most értesítünk mindenkit, "aki kapja marja" elven
                }
            }
        } catch (error) {
            console.error('Error checking waitlist:', error);
        }
    }
}
