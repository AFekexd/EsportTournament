import "dotenv/config";
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

async function main() {
    // 1. Get a user
    const user = await prisma.user.findFirst();
    
    if (!user) {
        console.error("No users found in database.");
        return;
    }

    console.log(`Testing with user: ${user.email} (${user.id})`);
    console.log("Current Preferences:");
    console.log(`  - Tournaments: ${user.emailPrefTournaments}`);
    console.log(`  - Matches: ${user.emailPrefMatches}`);
    console.log(`  - System: ${user.emailPrefSystem}`);
    console.log(`  - Digest: ${user.emailPrefWeeklyDigest}`);
    console.log(`  - Bookings: ${user.emailPrefBookings}`);

    // 2. Generate Link
    const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(user.id);
    const signature = hmac.digest('hex');
    
    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    const link = `${baseUrl}/api/unsubscribe?userId=${user.id}&signature=${signature}`;
    
    console.log("\nGenerated Unsubscribe Link:");
    console.log(link);
    console.log("\nPlease visit this link to test unsubscribe.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
