import prisma from '../lib/prisma.js';
import { NotificationType } from '../generated/prisma/client.js';
import { emailService } from './emailService.js';


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
     * Called when a booking is created - sends confirmation email and in-app notification
     */
    static async createdBooking(booking: any) {
        const message = `Sikeres foglalás! Gép: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}`;
        await this.createNotification(booking.userId, 'BOOKING_CONFIRMED', message);

        // Send confirmation email
        const user = await prisma.user.findUnique({
            where: { id: booking.userId },
            select: { email: true }
        });

        if (user?.email) {
            const date = new Date(booking.startTime).toLocaleDateString('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Europe/Budapest'
            });
            const startTime = new Date(booking.startTime).toLocaleTimeString('hu-HU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Budapest'
            });
            const endTime = new Date(booking.endTime).toLocaleTimeString('hu-HU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Budapest'
            });

            await emailService.sendBookingConfirmation(
                user.email,
                {
                    computerName: booking.computer.name,
                    date,
                    startTime,
                    endTime,
                    qrCode: booking.checkInCode || undefined
                },
                booking.userId
            );
        }
    }

    /**
     * Called when a booking is cancelled - sends cancellation email
     */
    static async cancelledBooking(booking: any, reason?: string) {
        const message = `Foglalás törölve: ${booking.computer.name}, Időpont: ${new Date(booking.startTime).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' })}`;
        await this.createNotification(booking.userId, 'BOOKING_CANCELLED', message);

        // Send cancellation email
        const user = await prisma.user.findUnique({
            where: { id: booking.userId },
            select: { email: true }
        });

        if (user?.email) {
            const date = new Date(booking.startTime).toLocaleDateString('hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Europe/Budapest'
            });
            const startTime = new Date(booking.startTime).toLocaleTimeString('hu-HU', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Budapest'
            });

            await emailService.sendBookingCancelled(
                user.email,
                {
                    computerName: booking.computer.name,
                    date,
                    startTime,
                    reason
                },
                booking.userId
            );
        }
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

                    // Email reminder
                    if (booking.user.email) {
                        await emailService.sendBookingReminder(
                            booking.user.email,
                            booking.computer.name,
                            startTimeStr,
                            booking.userId
                        );
                    }

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

                    // Email notification
                    if (entry.user.email) {
                        await emailService.sendWaitlistNotification(
                            entry.user.email,
                            entry.computer.name,
                            availableTimeStr,
                            entry.userId
                        );
                    }

                    console.log(`Waitlist notification sent to user ${entry.userId} for ${entry.computer.name}`);
                }
            }
        } catch (error) {
            console.error('Error checking waitlist:', error);
        }
    }
}
