// backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import { CONFIGS, type Environment } from './seeders/config';
import { seedUsers } from './seeders/users';
import { seedTeams } from './seeders/teams';
import { seedWages } from './seeders/wages';
import { seedWeeklyClaimsAndClaims } from './seeders/claims';
import { seedExpenses } from './seeders/expenses';
import { seedBoardActions } from './seeders/actions';
import { seedNotifications } from './seeders/notifications';
import { seedAdmins } from './seeders/admin';

const prisma = new PrismaClient();

/**
 * Clears all data from the database in the correct order
 */
async function clearData() {
  console.log('\n🗑️  Clearing existing data...');
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  console.log('  ✓ Data cleared');
}

/**
 * Prints summary statistics of the seeded database
 */
async function printSummary(env: Environment) {
  const duration = ((Date.now() - (globalThis as any).seedStartTime) / 1000).toFixed(2);

  console.log('\n✅ Seeding completed successfully!');
  console.log(`\n📊 Summary (${env}):`);
  console.log(`  - Users: ${await prisma.user.count()}`);
  console.log(`  - Teams: ${await prisma.team.count()}`);
  console.log(`  - Memberships: ${await prisma.memberTeamsData.count()}`);
  console.log(`  - Wages: ${await prisma.wage.count()}`);
  console.log(`  - Weekly Claims: ${await prisma.weeklyClaim.count()}`);
  console.log(`  - Claims: ${await prisma.claim.count()}`);
  console.log(`  - Expenses: ${await prisma.expense.count()}`);
  console.log(`  - Contracts: ${await prisma.teamContract.count()}`);
  console.log(`  - Board Actions: ${await prisma.boardOfDirectorActions.count()}`);
  console.log(`  - Notifications: ${await prisma.notification.count()}`);
  console.log(`\n⏱️  Total time: ${duration}s`);
}

/**
 * Main seeding orchestration function
 * Coordinates all seeder functions in the correct order
 */
async function main() {
  (globalThis as any).seedStartTime = Date.now();
  console.log('🌱 Starting database seeding...');

  const env = (process.env.NODE_ENV || 'development') as Environment;
  console.log(`📍 Environment: ${env}`);

  // Parse control flags
  const shouldClearData = process.env.CLEAR_DATA === 'true';
  const shouldSeedDatabase = process.env.SEED_DATABASE === 'true';
  const shouldSeedAdmins = process.env.SEED_ADMINS === 'true';
  const hasAdminConfig = !!(process.env.ADMIN_ADDRESSES && process.env.ADMIN_ROLES);

  // Validate flags
  if (shouldSeedAdmins && !hasAdminConfig) {
    throw new Error(
      '⚠️  INVALID CONFIGURATION: SEED_ADMINS=true requires ADMIN_ADDRESSES and ADMIN_ROLES to be set'
    );
  }

  // Production restrictions
  if (env === 'production') {
    if (shouldClearData) {
      throw new Error('⚠️  PRODUCTION RESTRICTION: Cannot clear database in production');
    }

    if (!shouldSeedAdmins && !shouldSeedDatabase) {
      throw new Error(
        '⚠️  PRODUCTION MODE: Must explicitly set SEED_DATABASE=true or SEED_ADMINS=true in production'
      );
    }
  }

  const config = CONFIGS[env];

  // Clear data if requested (only non-production)
  if (shouldClearData && env !== 'production') {
    await clearData();
  }

  // Run normal database seeding if requested
  if (shouldSeedDatabase) {
    console.log('\n📊 Database seeding...');
    const users = await seedUsers(prisma, config, env);
    const teams = await seedTeams(prisma, config, users);
    const wages = await seedWages(prisma, teams, config);
    await seedWeeklyClaimsAndClaims(prisma, wages, config);
    await seedExpenses(prisma, teams, config);
    await seedBoardActions(prisma, teams, config);
    await seedNotifications(prisma, users, config);
  }

  // Run admin seeding if requested
  if (shouldSeedAdmins) {
    console.log('\n👤 Admin role seeding...');
    await seedAdmins(prisma);
  }

  await printSummary(env);
}main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
