import prisma from '../lib/prisma.js';
import { logSystemActivity } from './logService.js';

export class BookingCleanupService {
    private static CHECK_INTERVAL_MS = 60 * 1000; // Run every 1 minute
    private static NO_SHOW_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
    private static intervalId: NodeJS.Timeout | null = null;

    /**
     * Starts the periodic cleanup job.
     */
    public static startCleanupJob() {
        if (this.intervalId) {
            console.log('[CLEANUP] Job already running.');
            return;
        }

        console.log('[CLEANUP] Starting no-show booking cleanup job...');
        // Run immediately on start
        this.cleanupNoShows();

        // Then run periodically
        this.intervalId = setInterval(() => {
            this.cleanupNoShows();
        }, this.CHECK_INTERVAL_MS);
    }

    /**
     * Stops the cleanup job.
     */
    public static stopCleanupJob() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[CLEANUP] Job stopped.');
        }
    }

    /**
     * Finds and deletes bookings where the user hasn't checked in within the threshold.
     */
    private static async cleanupNoShows() {
        try {
            const now = new Date();
            const thresholdTime = new Date(now.getTime() - this.NO_SHOW_THRESHOLD_MS);

            // Find bookings that have started more than 15 mins ago, but not checked in
            const noShowBookings = await prisma.booking.findMany({
                where: {
                    startTime: { lt: thresholdTime },
                    endTime: { gt: now }, // Only current bookings (ignore old finished ones that might remain for history)
                    checkedInAt: null,
                },
                include: {
                    user: { select: { username: true, id: true } },
                    computer: { select: { name: true, id: true } }
                }
            });

            if (noShowBookings.length > 0) {
                console.log(`[CLEANUP] Found ${noShowBookings.length} no-show bookings.`);

                for (const booking of noShowBookings) {
                    await prisma.booking.delete({
                        where: { id: booking.id }
                    });

                    await logSystemActivity(
                        'BOOKING_NOSHOW_CANCEL',
                        `Booking automatically cancelled (No-Show) for ${booking.user.username} on ${booking.computer.name}`,
                        {
                            userId: booking.userId,
                            metadata: {
                                bookingId: booking.id,
                                reason: 'NO_SHOW_THRESHOLD_EXCEEDED',
                                startTime: booking.startTime,
                                thresholdTime: thresholdTime
                            }
                        }
                    );

                    console.log(`[CLEANUP] Cancelled booking ${booking.id} for user ${booking.user.username}`);
                }
            }
        } catch (error) {
            console.error('[CLEANUP] Error during no-show cleanup:', error);
        }
    }
}
