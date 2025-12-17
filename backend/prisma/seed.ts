import prisma from '../src/lib/prisma.js';
import { Role, TeamRole, TournamentFormat, TournamentStatus, MatchStatus } from '../generated/prisma/client.js';


async function main() {
    console.log('🌱 Starting database seed...');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await prisma.notification.deleteMany();
    await prisma.gameStats.deleteMany();
    await prisma.match.deleteMany();
    await prisma.tournamentEntry.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.team.deleteMany();
    await prisma.game.deleteMany();
    await prisma.event.deleteMany();
    await prisma.user.deleteMany();

    // Create Users
    console.log('👥 Creating users...');
    const users = await Promise.all([
        prisma.user.create({
            data: {
                keycloakId: 'admin-001',
                email: 'admin@esport.hu',
                username: 'admin',
                displayName: 'Admin User',
                role: Role.ADMIN,
                elo: 1500,
            },
        }),
        prisma.user.create({
            data: {
                keycloakId: 'organizer-001',
                email: 'organizer@esport.hu',
                username: 'organizer1',
                displayName: 'Tournament Organizer',
                role: Role.ORGANIZER,
                elo: 1400,
            },
        }),
        ...Array.from({ length: 20 }, (_, i) =>
            prisma.user.create({
                data: {
                    keycloakId: `student-${String(i + 1).padStart(3, '0')}`,
                    email: `student${i + 1}@esport.hu`,
                    username: `player${i + 1}`,
                    displayName: `Player ${i + 1}`,
                    role: Role.STUDENT,
                    elo: 1000 + Math.floor(Math.random() * 500),
                },
            })
        ),
    ]);
    console.log(`✅ Created ${users.length} users`);

    // Create Games
    console.log('🎮 Creating games...');
    const games = await Promise.all([
        prisma.game.create({
            data: {
                name: 'League of Legends',
                description: '5v5 MOBA játék a Riot Games-től',
                imageUrl: 'https://cdn1.epicgames.com/offer/24b9b5e323bc40eea252a10cdd3b2f10/EGS_LeagueofLegends_RiotGames_S1_2560x1440-47eb328eac5ddd63ebd096ded7d0d5ab',
                rules: 'Summoner\'s Rift, Draft Pick, Best of 3',
                teamSize: 5,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Counter-Strike 2',
                description: 'Taktikai FPS játék',
                imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg',
                rules: 'Competitive mode, MR12, Best of 3',
                teamSize: 5,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Valorant',
                description: '5v5 karakter-alapú taktikai FPS',
                imageUrl: 'https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt5c61e4e61f7f5e5e/valorant-logo.png',
                rules: 'Unrated/Competitive, Best of 3',
                teamSize: 5,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Rocket League',
                description: 'Autós foci játék',
                imageUrl: 'https://rocketleague.media.zestyio.com/rl-logo.png',
                rules: 'Soccar, 5 minutes, Best of 5',
                teamSize: 3,
            },
        }),
        prisma.game.create({
            data: {
                name: 'FIFA 24',
                description: 'Foci szimulátor',
                imageUrl: 'https://media.contentapi.ea.com/content/dam/ea/fifa/fifa-24/common/fifa-24-logo.png',
                rules: 'Ultimate Team, 6 minutes halves',
                teamSize: 1,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Dota 2',
                description: '5v5 MOBA játék a Valve-tól',
                imageUrl: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota2_social.jpg',
                rules: 'All Pick, Captains Mode, Best of 3',
                teamSize: 5,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Overwatch 2',
                description: '5v5 hero shooter',
                imageUrl: 'https://images.blz-contentstack.com/v3/assets/blt9c12f249ac15c7ec/ow2-logo.png',
                rules: 'Competitive, Control/Escort/Hybrid',
                teamSize: 5,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Fortnite',
                description: 'Battle Royale játék',
                imageUrl: 'https://cdn2.unrealengine.com/fortnite-logo.png',
                rules: 'Duo/Squad, Arena mode',
                teamSize: 2,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Apex Legends',
                description: '3v3 Battle Royale',
                imageUrl: 'https://media.contentapi.ea.com/content/dam/apex-legends/common/apex-logo.png',
                rules: 'Trios, Ranked Arena',
                teamSize: 3,
            },
        }),
        prisma.game.create({
            data: {
                name: 'Rainbow Six Siege',
                description: '5v5 taktikai FPS',
                imageUrl: 'https://staticctf.akamaized.net/J3yJr34U2pZ2Ieem48Dwy9uqj5PNUQTn/r6-logo.png',
                rules: 'Ranked, Best of 3',
                teamSize: 5,
            },
        }),
    ]);
    console.log(`✅ Created ${games.length} games`);

    // Create Teams
    console.log('👥 Creating teams...');
    const teams = await Promise.all([
        ...Array.from({ length: 15 }, (_, i) => {
            const ownerIndex = i % users.length;
            return prisma.team.create({
                data: {
                    name: `Team ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron'][i]}`,
                    description: `Competitive esports team #${i + 1}`,
                    logoUrl: `https://ui-avatars.com/api/?name=Team+${i + 1}&background=random&size=256`,
                    joinCode: `TEAM${String(i + 1).padStart(4, '0')}`,
                    ownerId: users[ownerIndex].id,
                    elo: 1000 + Math.floor(Math.random() * 800),
                },
            });
        }),
    ]);
    console.log(`✅ Created ${teams.length} teams`);

    // Create Team Members
    console.log('👥 Creating team members...');
    let memberCount = 0;
    for (const team of teams) {
        // Add owner as captain
        await prisma.teamMember.create({
            data: {
                userId: team.ownerId,
                teamId: team.id,
                role: TeamRole.CAPTAIN,
            },
        });
        memberCount++;

        // Add 2-4 random members
        const numMembers = 2 + Math.floor(Math.random() * 3);
        const availableUsers = users.filter(u => u.id !== team.ownerId);
        const selectedUsers = availableUsers.sort(() => 0.5 - Math.random()).slice(0, numMembers);

        for (const user of selectedUsers) {
            try {
                await prisma.teamMember.create({
                    data: {
                        userId: user.id,
                        teamId: team.id,
                        role: TeamRole.MEMBER,
                    },
                });
                memberCount++;
            } catch (e) {
                // Skip if user already in team
            }
        }
    }
    console.log(`✅ Created ${memberCount} team members`);

    // Create Tournaments
    console.log('🏆 Creating tournaments...');
    const now = new Date();
    const tournaments = await Promise.all([
        // Past tournament
        prisma.tournament.create({
            data: {
                name: 'Téli LoL Bajnokság 2024',
                description: 'Az év legnagyobb League of Legends versenye',
                gameId: games[0].id,
                format: TournamentFormat.SINGLE_ELIMINATION,
                status: TournamentStatus.COMPLETED,
                maxTeams: 16,
                startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                endDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
                registrationDeadline: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
            },
        }),
        // Registration open
        prisma.tournament.create({
            data: {
                name: 'Tavaszi CS2 Kupa',
                description: 'Counter-Strike 2 verseny kezdőknek és haladóknak',
                gameId: games[1].id,
                format: TournamentFormat.SINGLE_ELIMINATION,
                status: TournamentStatus.REGISTRATION,
                maxTeams: 8,
                startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
                endDate: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
                registrationDeadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            },
        }),
        // In progress
        prisma.tournament.create({
            data: {
                name: 'Valorant Showdown',
                description: 'Heti Valorant verseny',
                gameId: games[2].id,
                format: TournamentFormat.SINGLE_ELIMINATION,
                status: TournamentStatus.IN_PROGRESS,
                maxTeams: 8,
                startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
                endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
                registrationDeadline: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            },
        }),
        ...Array.from({ length: 7 }, (_, i) =>
            prisma.tournament.create({
                data: {
                    name: `${games[(i + 3) % games.length].name} Tournament #${i + 1}`,
                    description: `Competitive tournament for ${games[(i + 3) % games.length].name}`,
                    gameId: games[(i + 3) % games.length].id,
                    format: [TournamentFormat.SINGLE_ELIMINATION, TournamentFormat.DOUBLE_ELIMINATION, TournamentFormat.ROUND_ROBIN][i % 3],
                    status: [TournamentStatus.DRAFT, TournamentStatus.REGISTRATION, TournamentStatus.IN_PROGRESS][i % 3],
                    maxTeams: [8, 16, 32][i % 3],
                    startDate: new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
                    endDate: new Date(now.getTime() + (i + 2) * 7 * 24 * 60 * 60 * 1000),
                    registrationDeadline: new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000),
                },
            })
        ),
    ]);
    console.log(`✅ Created ${tournaments.length} tournaments`);

    // Create Tournament Entries for team tournaments
    console.log('📝 Creating tournament entries...');
    let entryCount = 0;
    for (const tournament of tournaments.slice(0, 5)) {
        // Skip FIFA tournament (will add solo entries separately)
        const game = games.find(g => tournaments.find(t => t.id === tournament.id && t.gameId === g.id));
        const numEntries = Math.min(tournament.maxTeams, 4 + Math.floor(Math.random() * 4));
        const selectedTeams = teams.sort(() => 0.5 - Math.random()).slice(0, numEntries);

        for (let i = 0; i < selectedTeams.length; i++) {
            await prisma.tournamentEntry.create({
                data: {
                    tournamentId: tournament.id,
                    teamId: selectedTeams[i].id,
                    seed: i + 1,
                },
            });
            entryCount++;
        }
    }
    console.log(`✅ Created ${entryCount} team tournament entries`);

    // Create Solo Tournament (FIFA 24 - 1v1)
    console.log('🎮 Creating solo tournament...');
    const soloTournament = await prisma.tournament.create({
        data: {
            name: 'FIFA 24 Solo Bajnokság',
            description: '1v1 FIFA 24 verseny egyéni játékosoknak - nincs szükség csapatra!',
            gameId: games.find(g => g.name === 'FIFA 24')!.id,
            format: TournamentFormat.SINGLE_ELIMINATION,
            status: TournamentStatus.REGISTRATION,
            maxTeams: 32, // Actually max players for solo
            startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
            registrationDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
    });

    // Register individual players for solo tournament
    let soloEntryCount = 0;
    for (let i = 0; i < Math.min(users.length, 16); i++) {
        await prisma.tournamentEntry.create({
            data: {
                tournament: { connect: { id: soloTournament.id } },
                user: { connect: { id: users[i].id } },
                seed: i + 1,
            },
        });
        soloEntryCount++;
    }
    console.log(`✅ Created ${soloEntryCount} solo tournament entries`);

    // Create Large Team Tournament (CS2 - 32 teams with many entries)
    console.log('🏆 Creating large tournament...');
    const largeTournament = await prisma.tournament.create({
        data: {
            name: 'Nagy CS2 Liga 2025',
            description: 'A legnagyobb Counter-Strike 2 verseny - 32 csapattal!',
            gameId: games.find(g => g.name === 'Counter-Strike 2')!.id,
            format: TournamentFormat.DOUBLE_ELIMINATION,
            status: TournamentStatus.REGISTRATION,
            maxTeams: 32,
            startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
            registrationDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
    });

    // Register all teams for large tournament
    let largeEntryCount = 0;
    for (let i = 0; i < teams.length; i++) {
        await prisma.tournamentEntry.create({
            data: {
                tournamentId: largeTournament.id,
                teamId: teams[i].id,
                seed: i + 1,
            },
        });
        largeEntryCount++;
    }
    console.log(`✅ Created ${largeEntryCount} large tournament entries`);

    // Create Events
    console.log('📅 Creating events...');
    const events = await Promise.all([
        ...Array.from({ length: 10 }, (_, i) =>
            prisma.event.create({
                data: {
                    name: `Gaming Night #${i + 1}`,
                    description: `Közös játék este ${i + 1}`,
                    eventDate: new Date(now.getTime() + (i - 2) * 7 * 24 * 60 * 60 * 1000),
                    location: i % 2 === 0 ? 'Online' : 'Campus Gaming Room',
                },
            })
        ),
    ]);
    console.log(`✅ Created ${events.length} events`);

    // Create Game Stats
    console.log('📊 Creating game stats...');
    let statsCount = 0;
    for (const user of users.slice(0, 10)) {
        for (const game of games.slice(0, 3)) {
            await prisma.gameStats.create({
                data: {
                    userId: user.id,
                    gameId: game.id,
                    inGameId: `${user.username}_${game.name.replace(/\s/g, '')}`,
                    stats: {
                        wins: Math.floor(Math.random() * 50),
                        losses: Math.floor(Math.random() * 50),
                        kills: Math.floor(Math.random() * 500),
                        deaths: Math.floor(Math.random() * 500),
                        assists: Math.floor(Math.random() * 300),
                    },
                },
            });
            statsCount++;
        }
    }
    console.log(`✅ Created ${statsCount} game stats`);

    // Create Notifications
    console.log('🔔 Creating notifications...');
    let notifCount = 0;
    for (const user of users.slice(0, 5)) {
        await prisma.notification.create({
            data: {
                userId: user.id,
                type: 'TOURNAMENT_INVITE',
                title: 'Új verseny!',
                message: 'Regisztrálj a Tavaszi CS2 Kupára!',
                link: `/tournaments/${tournaments[1].id}`,
                read: false,
            },
        });
        notifCount++;
    }
    console.log(`✅ Created ${notifCount} notifications`);

    console.log('✨ Seed completed successfully!');
    console.log(`
📊 Summary:
- Users: ${users.length}
- Games: ${games.length}
- Teams: ${teams.length}
- Team Members: ${memberCount}
- Tournaments: ${tournaments.length}
- Tournament Entries: ${entryCount}
- Events: ${events.length}
- Game Stats: ${statsCount}
- Notifications: ${notifCount}
    `);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
