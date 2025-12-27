
import prisma from './src/lib/prisma';

async function main() {
    console.log('🐞 Starting bug reproduction...');

    try {
        // 1. Create 3 users
        const users = await Promise.all([1, 2, 3].map(i => 
            prisma.user.upsert({
                where: { username: `bugtest_user_${i}` },
                update: {},
                create: {
                    keycloakId: `bugtest_user_${i}`,
                    email: `bugtest_user_${i}@example.com`,
                    username: `bugtest_user_${i}`,
                    displayName: `Bug Test User ${i}`,
                }
            })
        ));
        console.log('Created 3 users');

        // 2. Create a team
        const team = await prisma.team.upsert({
            where: { name: 'Bug Test Team' },
            update: {},
            create: {
                name: 'Bug Test Team',
                joinCode: 'BUGTEST123',
                ownerId: users[0].id,
                elo: 1000
            }
        });

        // Add members to team
        for (const user of users) {
             await prisma.teamMember.upsert({
                where: { userId_teamId: { userId: user.id, teamId: team.id } },
                update: {},
                create: {
                    userId: user.id,
                    teamId: team.id,
                }
             });
        }
        console.log('Created team with 3 members');

        // 3. Create a simplified Game
        const game = await prisma.game.upsert({
            where: { name: 'Bug Test Game' },
            update: {},
            create: {
                name: 'Bug Test Game',
                teamSize: 3
            }
        });

        // 4. Create Tournament (3v3, Max 5 Teams)
        const tournament = await prisma.tournament.create({
            data: {
                name: 'Bug Test Tournament 3v3',
                gameId: game.id,
                maxTeams: 5,
                teamSize: 3,
                startDate: new Date(),
                registrationDeadline: new Date(),
                status: 'REGISTRATION'
            }
        });
        console.log(`Created tournament ${tournament.id} with maxTeams=5`);

        // 5. Register Team (simulate endpoint logic)
        // One entry, connecting 3 participants
        await prisma.tournamentEntry.create({
            data: {
                tournamentId: tournament.id,
                teamId: team.id,
                seed: 1000,
                participants: {
                    connect: users.map(u => ({ id: u.id }))
                }
            }
        });
        console.log('Registered team with 3 participants');

        // 6. Check Count
        const fetchedTournament = await prisma.tournament.findUnique({
             where: { id: tournament.id },
             include: {
                 _count: { select: { entries: true } },
                 entries: {
                     include: { participants: true }
                 }
             }
        });

        if (!fetchedTournament) throw new Error('Tournament not found');

        console.log('--------------------------------------------------');
        console.log(`Tournament ID: ${fetchedTournament.id}`);
        console.log(`Max Teams: ${fetchedTournament.maxTeams}`);
        console.log(`_count.entries: ${fetchedTournament._count.entries}`);
        console.log(`entries.length: ${fetchedTournament.entries.length}`);
        
        fetchedTournament.entries.forEach((e, idx) => {
            console.log(`Entry #${idx+1}: TeamID=${e.teamId}, Participants=${e.participants.length}`);
        });
        console.log('--------------------------------------------------');

        if (fetchedTournament._count.entries === 3) {
            console.log('❌ BUG REPRODUCED: _count.entries is 3! (Should be 1)');
        } else if (fetchedTournament._count.entries === 1) {
             if (fetchedTournament.entries.length === 1) {
                console.log('✅ BACKEND WORKS CORRECTLY: Count is 1.');
             } else {
                 console.log(`❓ WEIRD: _count=1 but length=${fetchedTournament.entries.length}`);
             }
        } else {
            console.log(`❓ Unexpected count: ${fetchedTournament._count.entries}`);
        }

        // Cleanup
        await prisma.tournamentEntry.deleteMany({ where: { tournamentId: tournament.id } });
        await prisma.tournament.delete({ where: { id: tournament.id } });
        // Keeping users/team/game for simplicity or delete them too if strict
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
