import prisma from '../lib/prisma.js';
import { NotificationType } from '../generated/prisma/client.js';

export class BookingNotificationService {
    // 30 perc
    private static REMINDER_TIME_MS = 30 * 60 * 1000;

    static async createNotification(userId: string, type: NotificationType, message: string) {
        try {
            await prisma.notification.create({
                data: {
                    userId,
                    type,
                    title: type.toString(),
                    message,
                },
            });
        } catch (error) {
            console.error('Error creating notification:', error);
        }
    }

    /**
     * Called when a booking is created - sends in-app notification
     */
    static async createdBooking(booking: any) {
        const isPending = booking.status === 'PENDING';
        const message = isPending
            ? `Foglalási kérelem elküldve! Gép: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}. A DÖK értesítést kapott a felügyelet vállalására!`
            : `Sikeres foglalás! Gép: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}`;
        await this.createNotification(booking.userId, 'BOOKING_CONFIRMED', message);
    }

    /**
     * Called when a booking is cancelled - sends in-app notification
     */
    static async cancelledBooking(booking: any, reason?: string) {
        const message = `Foglalás törölve: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}`;
        await this.createNotification(booking.userId, 'BOOKING_CANCELLED', message);
    }

    /**
     * Background job that sends reminders 30 minutes before bookings start
     */
    static async startReminderJob() {
        console.log('Starting Booking Reminder Job...');

        setInterval(async () => {
            try {
                const now = new Date();
                const reminderThreshold = new Date(now.getTime() + this.REMINDER_TIME_MS);

                // Find bookings starting soon that haven't received a reminder
                const upcomingBookings = await prisma.booking.findMany({
                    where: {
                        startTime: {
                            gte: now,
                            lte: reminderThreshold
                        },
                        reminderSent: false
                    },
                    include: {
                        computer: true,
                        user: true
                    }
                });

                for (const booking of upcomingBookings) {
                    const startTimeStr = new Date(booking.startTime).toLocaleTimeString('hu-HU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Europe/Budapest'
                    });

                    // In-app notification
                    const message = `Emlékeztető: A foglalásod hamarosan kezdődik! (${booking.computer.name} - ${startTimeStr})`;
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
        }, 60000); // Runs every minute
    }

    /**
     * Check waitlist entries when a booking slot becomes available
     */
    static async checkWaitlist(computerId: string, startTime: Date, endTime: Date) {
        try {
            // Find waitlist entries for this computer on this date
            const dayStart = new Date(startTime);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(startTime);
            dayEnd.setHours(23, 59, 59, 999);

            const waitlistEntries = await prisma.waitlist.findMany({
                where: {
                    computerId,
                    date: {
                        gte: dayStart,
                        lte: dayEnd
                    }
                },
                include: {
                    user: true,
                    computer: true
                }
            });

            for (const entry of waitlistEntries) {
                // Check time overlap
                const entryStart = new Date(entry.date);
                entryStart.setHours(entry.startHour, 0, 0, 0);
                const entryEnd = new Date(entry.date);
                entryEnd.setHours(entry.endHour, 0, 0, 0);

                const freeStart = new Date(startTime);
                const freeEnd = new Date(endTime);

                // If there's overlap between freed slot and waitlist entry
                if (entryStart < freeEnd && entryEnd > freeStart) {
                    const availableTimeStr = `${startTime.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' })} - ${endTime.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' })}`;

                    // In-app notification
                    const message = `Jó hír! Felszabadult egy gép, amire vártál: ${entry.computer.name} (${availableTimeStr})`;
                    await this.createNotification(entry.userId, 'WAITLIST_AVAILABLE', message);

                    console.log(`Waitlist notification sent to user ${entry.userId} for ${entry.computer.name}`);
                }
            }
        } catch (error) {
            console.error('Error checking waitlist:', error);
        }
    }
}
