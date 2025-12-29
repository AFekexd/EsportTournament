import prisma from '../lib/prisma.js';

export const logSystemActivity = async (
    type: string,
    message: string,
    options: {
        userId?: string;
        adminId?: string;
        computerId?: string;
        metadata?: any;
    } = {}
) => {
    try {
        await prisma.log.create({
            data: {
                type,
                message,
                userId: options.userId,
                adminId: options.adminId,
                computerId: options.computerId,
                metadata: options.metadata || undefined
            }
        });
    } catch (error) {
        console.error('Failed to create system log:', error);
    }
};
