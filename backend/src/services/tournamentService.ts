import prisma from '../lib/prisma.js';
import { ApiError } from '../middleware/errorHandler.js';
import { UserRole, TournamentStatus } from '../utils/enums.js';

interface RegistrationData {
    tournamentId: string;
    userId?: string;
    teamId?: string;
    memberIds?: string[];
    registrantUser: any; // Authenticated user
}

export const tournamentService = {
    async deleteBracket(tournamentId: string) {
        return await prisma.match.deleteMany({
            where: { tournamentId }
        });
    },

    async register(data: RegistrationData) {
        const { tournamentId, userId, teamId, memberIds, registrantUser } = data;

        // Transaction to ensure data consistency
        return await prisma.$transaction(async (tx) => {
            const tournament = await tx.tournament.findUnique({
                where: { id: tournamentId },
                include: { _count: { select: { entries: true } }, entries: true, game: true }
            });

            if (!tournament) throw new ApiError('Verseny nem található', 404, 'NOT_FOUND');

            if (tournament.status !== TournamentStatus.REGISTRATION) {
                // Allow admins to override? For now, stick to strict rules or check permission before calling service
                if (![UserRole.ADMIN, UserRole.ORGANIZER].includes(registrantUser.role)) {
                    throw new ApiError('A versenyre jelenleg nem lehet regisztrálni', 400, 'REGISTRATION_CLOSED');
                }
            }

            if (new Date() > tournament.registrationDeadline && ![UserRole.ADMIN, UserRole.ORGANIZER].includes(registrantUser.role)) {
                throw new ApiError('A verseny befejezve', 400, 'DEADLINE_PASSED');
            }

            // Determine tournament type and size
            const teamSize = tournament.teamSize ?? tournament.game?.teamSize ?? 1;
            const isSolo = teamSize === 1;

            // Check capacity
            let currentCount = tournament._count.entries;
            if (!isSolo) {
                const uniqueTeams = new Set(tournament.entries.map(e => e.teamId).filter(Boolean));
                currentCount = uniqueTeams.size;
            } else {
                currentCount = tournament.entries.length;
            }

            if (currentCount >= tournament.maxTeams) {
                throw new ApiError('A verseny megtelt', 400, 'TOURNAMENT_FULL');
            }

            let entryData: any = {
                tournamentId: tournament.id,
                registeredAt: new Date(),
            };

            if (isSolo) {
                // --- SOLO LOGIC ---
                let targetUser = registrantUser;
                // If admin is registering someone else
                if (userId && userId !== registrantUser.id) {
                    if (![UserRole.ADMIN, UserRole.ORGANIZER].includes(registrantUser.role)) {
                        throw new ApiError('Csak szervezők regisztrálhatnak más felhasználókat', 403, 'FORBIDDEN');
                    }
                    targetUser = await tx.user.findUnique({ where: { id: userId } });
                    if (!targetUser) throw new ApiError('A célszemély nem található', 404, 'TARGET_USER_NOT_FOUND');
                }

                // Check duplicate
                const existingEntry = await tx.tournamentEntry.findUnique({
                    where: { tournamentId_userId: { tournamentId: tournament.id, userId: targetUser.id } },
                });
                if (existingEntry) throw new ApiError('Ez a felhasználó már regisztrált', 400, 'ALREADY_REGISTERED');

                // Check rank
                if (tournament.requireRank) {
                    const userRank = await tx.userRank.findUnique({
                        where: { userId_gameId: { userId: targetUser.id, gameId: tournament.gameId } }
                    });
                    if (!userRank) {
                        throw new ApiError(`${targetUser.displayName || targetUser.username} nem rendelkezik ranggal ebben a játékban.`, 400, 'RANK_REQUIRED');
                    }
                }

                entryData.userId = targetUser.id;
                entryData.seed = targetUser.elo;
                entryData.participants = { connect: [{ id: targetUser.id }] };

            } else {
                // --- TEAM LOGIC ---
                if (!teamId) throw new ApiError('Csapat azonosító szükséges', 400, 'MISSING_TEAM_ID');

                const team = await tx.team.findUnique({
                    where: { id: teamId },
                    include: { members: { include: { user: true } } }
                });
                if (!team) throw new ApiError('Csapat nem található', 404, 'TEAM_NOT_FOUND');

                // Captain check
                if (team.ownerId !== registrantUser.id && ![UserRole.ADMIN, UserRole.ORGANIZER].includes(registrantUser.role)) {
                    throw new ApiError('Csak a csapatkapitány regisztrálhat', 403, 'NOT_CAPTAIN');
                }

                // Member validation
                if (!memberIds || memberIds.length !== teamSize) {
                    throw new ApiError(`Pontosan ${teamSize} tagot válassz ki.`, 400, 'INVALID_TEAM_SIZE');
                }

                const teamMemberIds = team.members.map(m => m.userId);
                if (!memberIds.every(id => teamMemberIds.includes(id))) {
                    throw new ApiError('Egy vagy több játékos nem tagja a csapatnak.', 400, 'INVALID_MEMBERS');
                }

                // Check duplicate
                const existingEntry = await tx.tournamentEntry.findUnique({
                    where: { tournamentId_teamId: { tournamentId: tournament.id, teamId } },
                });
                if (existingEntry) throw new ApiError('A csapat már regisztrált', 400, 'ALREADY_REGISTERED');

                // Check if any member is already registered with another team
                const existingMemberEntry = await tx.tournamentEntry.findFirst({
                    where: {
                        tournamentId: tournament.id,
                        participants: {
                            some: {
                                id: { in: memberIds }
                            }
                        }
                    },
                    include: {
                        participants: {
                            where: {
                                id: { in: memberIds }
                            }
                        },
                        team: true
                    }
                });

                if (existingMemberEntry) {
                    const duplicateMember = existingMemberEntry.participants[0];
                    const teamName = existingMemberEntry.team?.name || 'egy másik csapat';
                    throw new ApiError(
                        `${duplicateMember.displayName || duplicateMember.username} már regisztrált a versenyre a(z) ${teamName} csapattal.`,
                        400,
                        'MEMBER_ALREADY_REGISTERED'
                    );
                }

                // Rank check
                if (tournament.requireRank) {
                    const userRanks = await tx.userRank.findMany({
                        where: { userId: { in: memberIds }, gameId: tournament.gameId }
                    });
                    if (userRanks.length !== memberIds.length) {
                        throw new ApiError('Minden csapattagnak rendelkeznie kell ranggal.', 400, 'RANK_REQUIRED');
                    }
                }

                entryData.teamId = team.id;
                entryData.seed = team.elo;
                entryData.participants = { connect: memberIds.map(id => ({ id })) };
            }

            return await tx.tournamentEntry.create({
                data: entryData,
                include: {
                    team: true,
                    tournament: true,
                    user: { select: { id: true, username: true, displayName: true, avatarUrl: true, elo: true } },
                    participants: { select: { id: true, username: true, displayName: true, avatarUrl: true } }
                }
            });
        });
    }
};
