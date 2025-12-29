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

const prisma = new PrismaClient();

/**
 * Clears all data from the database in the correct order
 */
async function clearData() {
  console.log('\n🗑️  Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.boardOfDirectorActions.deleteMany();
  await prisma.teamContract.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.weeklyClaim.deleteMany();
  await prisma.wage.deleteMany();
  await prisma.memberTeamsData.deleteMany();
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

  // import.meta.env.NODE_ENV;
  const env = (process.env.NODE_ENV || 'development') as Environment;
  console.log(`📍 Environment: ${env}`);

  if (env === 'production') {
    throw new Error('⚠️  PRODUCTION SEEDING BLOCKED: Seeds cannot run in production');
  }

  const config = CONFIGS[env];

  // Optional: Clear existing data
  if (process.env.CLEAR_DATA === 'true') {
    await clearData();
  }

  // Seed in correct order
  const users = await seedUsers(prisma, config, env);
  const teams = await seedTeams(prisma, config, users);
  const wages = await seedWages(prisma, teams, config);
  await seedWeeklyClaimsAndClaims(prisma, wages, config);
  await seedExpenses(prisma, teams, config);
  await seedBoardActions(prisma, teams, config);
  await seedNotifications(prisma, users, config);

  await printSummary(env);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
