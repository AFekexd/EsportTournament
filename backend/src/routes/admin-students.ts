import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { logSystemActivity } from '../services/logService.js';
import multer from 'multer';
import * as xlsx from 'xlsx';

export const adminStudentsRouter: Router = Router();

// Setup Multer for memory upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper function to find a column by various possible names
function findColumn(row: any, possibleNames: string[]): any {
    const keys = Object.keys(row);
    for (const name of possibleNames) {
        const found = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
        if (found) return row[found];
    }
    return undefined;
}

// Calculate time balance based on average
function calculateTimeBalanceSeconds(average: number): number {
    // Example formula:
    // >= 4.5 -> 4 hours (14400 seconds)
    // >= 4.0 -> 3 hours (10800 seconds)
    // >= 3.5 -> 2 hours (7200 seconds)
    // >= 3.0 -> 1 hour (3600 seconds)
    // < 3.0 -> 0 hours
    if (average >= 4.5) return 14400;
    if (average >= 4.0) return 10800;
    if (average >= 3.5) return 7200;
    if (average >= 3.0) return 3600;
    return 0;
}

adminStudentsRouter.post(
    '/upload-grades',
    authenticate,
    upload.single('file'),
    asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const user = await prisma.user.findUnique({
            where: { keycloakId: req.user!.sub },
        });

        if (!user || user.role !== 'ADMIN') {
            throw new ApiError('Adminisztrátori hozzáférés szükséges', 403, 'FORBIDDEN');
        }

        if (!req.file) {
            throw new ApiError('Nincs fájl kiválasztva', 400, 'NO_FILE');
        }

        // Parse Excel
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Take first sheet
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
            throw new ApiError('Az Excel fájl üres vagy rossz formátumú.', 400, 'EMPTY_FILE');
        }

        let updatedCount = 0;
        let notFoundCount = 0;
        let bannedCount = 0;

        await prisma.$transaction(async (tx) => {
            // Read all students with OM ID at once to minimize DB calls if possible,
            // or just loop and update properly.
            for (const row of rawData) {
                const omId = findColumn(row, ['om', 'azonosító', 'azonosito']);
                if (!omId) continue; // Skip if no OM ID

                // Ensure pure string without trailing spaces
                const cleanOmId = String(omId).trim();

                // Find student
                const student = await tx.user.findFirst({
                    where: { omId: cleanOmId }
                });

                if (!student) {
                    notFoundCount++;
                    continue;
                }

                const averageVal = findColumn(row, ['átlag', 'atlag', 'tanulmányi', 'eredmény']);
                const failsVal = findColumn(row, ['bukás', 'bukas', 'elégtelen', 'elegtelen']);

                const average = parseFloat(String(averageVal).replace(',', '.'));
                const fails = parseInt(String(failsVal), 10);

                const isFailing = !isNaN(fails) ? fails > 0 : false;
                const newTimeToAdd = !isNaN(average) && !isFailing ? calculateTimeBalanceSeconds(average) : 0;

                await tx.user.update({
                    where: { id: student.id },
                    data: {
                        isBannedFromBooking: isFailing,
                        lastGradeAverage: !isNaN(average) ? average : null,
                        timeBalanceSeconds: {
                            increment: newTimeToAdd // Add new time to existing time (or we can overwrite, assuming increment is better)
                        }
                    }
                });

                updatedCount++;
                if (isFailing) bannedCount++;
            }
        });

        await logSystemActivity(
            'STUDENT_GRADES_UPLOAD',
            `Grades uploaded by ${user.username}. Updated: ${updatedCount}, Banned: ${bannedCount}, Not Found OM IDs: ${notFoundCount}`,
            { adminId: user.id }
        );

        res.json({
            success: true,
            message: 'Sikeres feltöltés',
            data: {
                updatedRecords: updatedCount,
                bannedStudents: bannedCount,
                notFoundOMIds: notFoundCount
            }
        });
    })
);
