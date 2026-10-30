import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();

  console.log('='.repeat(70));
  console.log('  STARTING SCRATCH RESET: REMOVING ALL STORED CREDENTIALS & TABLES');
  console.log('='.repeat(70));

  try {
    const userCountBefore = await prisma.user.count();
    const tokenCountBefore = await prisma.refreshToken.count();
    const projectCountBefore = await prisma.project.count();
    const diagramCountBefore = await prisma.diagram.count();

    console.log(`Current Database State:`);
    console.log(`  - Users: ${userCountBefore}`);
    console.log(`  - Refresh Tokens: ${tokenCountBefore}`);
    console.log(`  - Projects: ${projectCountBefore}`);
    console.log(`  - Diagrams: ${diagramCountBefore}`);

    // Delete child records first to respect foreign keys cleanly
    console.log('\nPurging all saved diagrams...');
    const deletedDiagrams = await prisma.diagram.deleteMany({});
    console.log(`  ✓ Deleted ${deletedDiagrams.count} diagram(s)`);

    console.log('Purging all saved projects...');
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`  ✓ Deleted ${deletedProjects.count} project(s)`);

    console.log('Purging all refresh tokens...');
    const deletedTokens = await prisma.refreshToken.deleteMany({});
    console.log(`  ✓ Deleted ${deletedTokens.count} token(s)`);

    console.log('Purging all user credentials & accounts...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`  ✓ Deleted ${deletedUsers.count} user credential(s)`);

    // Verify all counts are now 0
    const userCountAfter = await prisma.user.count();
    const tokenCountAfter = await prisma.refreshToken.count();
    const projectCountAfter = await prisma.project.count();
    const diagramCountAfter = await prisma.diagram.count();

    console.log('\nPost-Cleanup Database State:');
    console.log(`  - Users: ${userCountAfter}`);
    console.log(`  - Refresh Tokens: ${tokenCountAfter}`);
    console.log(`  - Projects: ${projectCountAfter}`);
    console.log(`  - Diagrams: ${diagramCountAfter}`);

    if (userCountAfter === 0 && tokenCountAfter === 0 && projectCountAfter === 0 && diagramCountAfter === 0) {
      console.log('\n✅ SUCCESS: All saved credentials and tables have been completely removed!');
      console.log('Database is now completely clean and ready to start from scratch.');
    } else {
      throw new Error('Cleanup verification failed: some records remain.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Failed to clean database:', err);
  process.exit(1);
});
