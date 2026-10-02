import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler, ApiError } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';
import { logSystemActivity } from '../services/logService.js';
import multer from 'multer';
import { readSheet } from 'read-excel-file/node';

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
        const rows = await readSheet(req.file.buffer);

        if (!rows || rows.length < 2) {
            throw new ApiError('Az Excel fájl üres vagy rossz formátumú.', 400, 'EMPTY_FILE');
        }

        const headers = rows[0].map((h: any) => String(h ?? '').trim());
        const rawData = rows.slice(1).map((row: any[]) => {
            const obj: Record<string, any> = {};
            headers.forEach((header: string, i: number) => {
                if (header && row[i] !== undefined && row[i] !== null) {
                    obj[header] = row[i];
                }
            });
            return obj;
        });

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

                let averageStr = String(averageVal || '').replace(',', '.').trim();
                let average = parseFloat(averageStr);

                let isFailing = false;

                // Explicit fail column check
                if (failsVal !== undefined) {
                    const fails = parseInt(String(failsVal), 10);
                    if (!isNaN(fails) && fails > 0) {
                        isFailing = true;
                    }
                }

                // If average is not explicitly provided or we want to check subjects, let's look at other columns
                let totalScore = 0;
                let numSubjects = 0;
                let hasSubjectGrades = false;

                const ignoredColumns = ['om', 'azonosító', 'azonosito', 'név', 'nev', 'átlag', 'atlag', 'tanulmányi', 'eredmény', 'bukás', 'bukas', 'elégtelen', 'elegtelen', 'osztály', 'osztaly'];

                for (const key of Object.keys(row as any)) {
                    const isIgnored = ignoredColumns.some(ignored => key.toLowerCase().includes(ignored));
                    if (!isIgnored) {
                        const valStr = String((row as any)[key] || '').replace(',', '.').trim();
                        const val = parseFloat(valStr);

                        // We assume anything that looks like a valid number between 1 and 5 is a grade
                        if (!isNaN(val) && val >= 1 && val <= 5) {
                            hasSubjectGrades = true;
                            totalScore += val;
                            numSubjects++;

                            if (val < 2.0) {
                                isFailing = true;
                            }
                        }
                    }
                }

                if (isNaN(average) && hasSubjectGrades && numSubjects > 0) {
                    average = totalScore / numSubjects;
                }

                await tx.user.update({
                    where: { id: student.id },
                    data: {
                        isBannedFromBooking: isFailing,
                        lastGradeAverage: !isNaN(average) ? average : null
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
