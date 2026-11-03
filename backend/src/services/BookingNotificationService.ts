import prisma from '../lib/prisma.js';
import { NotificationType } from '../generated/prisma/client.js';
import { logSystemActivity } from './logService.js';

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
     * Checks for pending booking requests where no supervisor volunteered
     * and the start time is 48 hours or less away.
     * Automatically deletes them and notifies the student and Discord channel.
     */
    static async checkAndAutoCancelPendingBookings() {
        try {
            const now = new Date();
            const autoCancelThreshold = new Date(now.getTime() + 48 * 60 * 60 * 1000);

            // Find all PENDING bookings that start within the next 48 hours (or in past if somehow unprocessed)
            const pendingBookings = await prisma.booking.findMany({
                where: {
                    status: 'PENDING',
                    startTime: {
                        lte: autoCancelThreshold
                    }
                },
                include: {
                    computer: true,
                    user: true
                }
            });

            for (const booking of pendingBookings) {
                const startTimeStr = new Date(booking.startTime).toLocaleString('hu-HU', {
                    timeZone: 'Europe/Budapest',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                // 1. Notify Discord message if available
                if (booking.discordMessageId) {
                    try {
                        const { discordService } = await import('./discordService.js');
                        await discordService.cancelPendingBookingNotification(booking.id, booking.discordMessageId);
                    } catch (discordErr) {
                        console.error(`Failed to update Discord embed for cancelled booking ${booking.id}:`, discordErr);
                    }
                }

                // 2. Delete booking to free slot and quota
                await prisma.booking.delete({
                    where: { id: booking.id }
                });

                // Audit log
                await logSystemActivity(
                    'BOOKING_AUTO_CANCEL',
                    `A(z) ${booking.computer.name} gépre leadott foglalás automatikusan törölve (${startTimeStr}) - 48 órával a kezdés előtt nem volt felügyelő`,
                    {
                        userId: booking.userId,
                        computerId: booking.computerId,
                        metadata: {
                            bookingId: booking.id,
                            reason: 'NO_SUPERVISOR_48H',
                            startTime: booking.startTime,
                            endTime: booking.endTime
                        }
                    }
                );

                // 3. Notify student
                const message = `A(z) ${booking.computer.name} gépre leadott foglalási kérelmed (${startTimeStr}) automatikusan törölve lett, mivel a kezdés előtti 48 óráig egy DÖK tag sem vállalta a felügyeletet. A heti kereted nem csökkent.`;
                await this.createNotification(booking.userId, 'BOOKING_CANCELLED', message);

                console.log(`Auto-cancelled pending booking ${booking.id} (no supervisor 48h prior)`);
            }
        } catch (error) {
            console.error('Error in checkAndAutoCancelPendingBookings:', error);
        }
    }

    /**
     * Background job that sends reminders 30 minutes before bookings start
     * and auto-cancels unapproved bookings 48 hours before start.
     */
    static async startReminderJob() {
        console.log('Starting Booking Reminder and Auto-Cancel Job...');

        // Initial run on server start
        await this.checkAndAutoCancelPendingBookings();

        setInterval(async () => {
            try {
                // Check and auto-cancel pending bookings without supervisor 48h prior
                await this.checkAndAutoCancelPendingBookings();

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
