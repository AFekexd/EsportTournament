import 'dotenv/config';
import prisma from './src/lib/prisma.js';

async function main() {
  console.log('🔍 Checking for duplicate Discord IDs...');
  console.log(`Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@')}`); // Mask password
  
  const totalUsers = await prisma.user.count();
  const discordUsers = await prisma.user.count({ where: { discordId: { not: null } } });
  console.log(`Total Users: ${totalUsers}`);
  console.log(`Users with Discord ID: ${discordUsers}`);

  const users = await prisma.user.groupBy({
    by: ['discordId'],
    having: {
      discordId: {
        _count: {
          gt: 1
        }
      }
    },
    where: {
      discordId: {
        not: null
      }
    }
  });

  if (users.length === 0) {
    console.log('✅ No duplicate Discord IDs found.');
    return;
  }

  console.log(`⚠️ Found ${users.length} Discord IDs appearing multiple times:\n`);

  for (const group of users) {
    if (!group.discordId) continue;
    
    const duplicates = await prisma.user.findMany({
      where: { discordId: group.discordId },
      select: { id: true, username: true, displayName: true, email: true, role: true, omId: true }
    });

    console.log(`Discord ID: ${group.discordId}`);
    duplicates.forEach(u => {
      console.log(`  - [${u.role}] ${u.displayName || u.username} (${u.email}) - OM: ${u.omId}`);
    });
    console.log('---------------------------------------------------');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
