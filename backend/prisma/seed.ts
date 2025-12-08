// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

type Environment = 'development' | 'test' | 'staging' | 'production';

interface SeedConfig {
  users: number;
  teams: number;
  membersPerTeam: number;
  wagesPerUser: number;
  weeklyClaimsPerUser: number;
  claimsPerWeeklyClaim: number;
  expensesPerTeam: number;
  contractsPerTeam: number;
  actionsPerTeam: number;
  notificationsPerUser: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIGS: Record<Environment, SeedConfig> = {
  development: {
    users: 10,
    teams: 5,
    membersPerTeam: 3,
    wagesPerUser: 3,
    weeklyClaimsPerUser: 4,
    claimsPerWeeklyClaim: 5,
    expensesPerTeam: 3,
    contractsPerTeam: 2,
    actionsPerTeam: 4,
    notificationsPerUser: 5,
  },
  test: {
    users: 3,
    teams: 2,
    membersPerTeam: 2,
    wagesPerUser: 2,
    weeklyClaimsPerUser: 2,
    claimsPerWeeklyClaim: 3,
    expensesPerTeam: 2,
    contractsPerTeam: 2,
    actionsPerTeam: 3,
    notificationsPerUser: 2,
  },
  staging: {
    users: 50,
    teams: 20,
    membersPerTeam: 5,
    wagesPerUser: 4,
    weeklyClaimsPerUser: 8,
    claimsPerWeeklyClaim: 7,
    expensesPerTeam: 5,
    contractsPerTeam: 3,
    actionsPerTeam: 5,
    notificationsPerUser: 10,
  },
  production: {
    users: 0,
    teams: 0,
    membersPerTeam: 0,
    wagesPerUser: 0,
    weeklyClaimsPerUser: 0,
    claimsPerWeeklyClaim: 0,
    expensesPerTeam: 0,
    contractsPerTeam: 0,
    actionsPerTeam: 0,
    notificationsPerUser: 0,
  },
};

// Hardhat test accounts
const HARDHAT_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomStatus<T extends string>(statuses: T[]): T {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getEthereumAddress(index: number, environment: Environment): string {
  if (environment === 'test') {
    return HARDHAT_ADDRESSES[index % HARDHAT_ADDRESSES.length];
  }
  if (environment === 'development' && index < HARDHAT_ADDRESSES.length) {
    return HARDHAT_ADDRESSES[index];
  }
  return faker.finance.ethereumAddress();
}

function getDateRanges() {
  const now = new Date();
  return {
    last7d: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    last30d: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    last90d: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    lastYear: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  };
}

function distributeDate(index: number, total: number): Date {
  const ranges = getDateRanges();
  const now = new Date();

  // 30% in last 7 days, 40% in last 30 days, 20% in last 90 days, 10% older
  const ratio = index / total;
  if (ratio < 0.3) {
    return randomDate(ranges.last7d, now);
  } else if (ratio < 0.7) {
    return randomDate(ranges.last30d, ranges.last7d);
  } else if (ratio < 0.9) {
    return randomDate(ranges.last90d, ranges.last30d);
  } else {
    return randomDate(ranges.lastYear, ranges.last90d);
  }
}

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function seedUsers(config: SeedConfig, environment: Environment) {
  console.log('\n👥 Seeding users...');

  const users = Array.from({ length: config.users }, (_, i) => ({
    address: getEthereumAddress(i, environment),
    name: environment === 'test' ? `User ${i + 1}` : faker.person.fullName(),
    nonce: generateNonce(),
    imageUrl: faker.image.avatar(),
    createdAt: distributeDate(i, config.users),
  }));

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  const created = await prisma.user.findMany();
  console.log(`  ✓ Created ${created.length} users`);
  return created;
}

async function seedTeams(config: SeedConfig, users: any[], environment: Environment) {
  console.log('\n🏢 Seeding teams...');

  const createdTeams = [];
  let totalMembers = 0;

  for (let i = 0; i < config.teams; i++) {
    const owner = users[i % users.length];
    const officer = users[(i + 1) % users.length];
    const teamCreatedAt = distributeDate(i, config.teams);

    // Select additional members (excluding owner)
    const memberCount = Math.min(config.membersPerTeam - 1, users.length - 1);
    const availableUsers = users.filter((u) => u.address !== owner.address);
    const selectedUsers = availableUsers.slice(0, memberCount);

    // All team members including owner
    const allMembers = [owner, ...selectedUsers];

    // Create team with owner and connect all members
    const team = await prisma.team.create({
      data: {
        name: environment === 'test' ? `Team ${i + 1}` : faker.company.name(),
        description: faker.company.catchPhrase(),
        ownerAddress: owner.address,
        officerAddress: officer.address,
        createdAt: teamCreatedAt,
        members: {
          connect: allMembers.map((user) => ({ address: user.address })),
        },
      },
    });

    // Create MemberTeamsData records for tracking
    for (let j = 0; j < allMembers.length; j++) {
      const memberCreatedAt = j === 0
        ? teamCreatedAt
        : new Date(teamCreatedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);

      await prisma.memberTeamsData.create({
        data: {
          teamId: team.id,
          userAddress: allMembers[j].address,
          createdAt: memberCreatedAt,
        },
      });
      totalMembers++;
    }

    createdTeams.push(team);
  }

  console.log(`  ✓ Created ${createdTeams.length} teams with ${totalMembers} memberships`);
  return createdTeams;
}



async function seedWages(teams: any[], users: any[], config: SeedConfig) {
  console.log('\n💰 Seeding wages...');

  const wages = [];
  let wageChainCount = 0;

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (const member of teamMembers) {
      const userWages = [];

      for (let i = 0; i < config.wagesPerUser; i++) {
        const baseRate = 20 + Math.random() * 30; // $20-50/hr
        const wage = await prisma.wage.create({
          data: {
            teamId: team.id,
            userAddress: member.userAddress,
            cashRatePerHour: parseFloat((baseRate * (1 + i * 0.1)).toFixed(2)),
            tokenRatePerHour: parseFloat((baseRate * 0.5).toFixed(2)),
            usdcRatePerHour: parseFloat((baseRate * 0.8).toFixed(2)),
            maximumHoursPerWeek: 40,
            createdAt: new Date(member.createdAt.getTime() + i * 60 * 24 * 60 * 60 * 1000),
          },
        });
        userWages.push(wage);
      }

      // Link wages in chain
      for (let i = 0; i < userWages.length - 1; i++) {
        await prisma.wage.update({
          where: { id: userWages[i].id },
          data: { nextWageId: userWages[i + 1].id },
        });
        wageChainCount++;
      }

      wages.push(...userWages);
    }
  }

  console.log(`  ✓ Created ${wages.length} wages (${wageChainCount} chains)`);
  return wages;
}

async function seedWeeklyClaimsAndClaims(wages: any[], config: SeedConfig) {
  console.log('\n📋 Seeding weekly claims and claims...');

  let weeklyClaimCount = 0;
  let claimCount = 0;

  for (const wage of wages) {
    const numWeeklyClaims = Math.floor(Math.random() * config.weeklyClaimsPerUser) + 1;

    for (let i = 0; i < numWeeklyClaims; i++) {
      const weekStart = distributeDate(i, numWeeklyClaims);
      const status = randomStatus(['pending', 'approved', 'rejected']);

      const weeklyClaim = await prisma.weeklyClaim.create({
        data: {
          memberAddress: wage.userAddress,
          teamId: wage.teamId,
          wageId: wage.id,
          weekStart,
          status,
          signature: status === 'approved' ? faker.string.hexadecimal({ length: 130 }) : null,
          data: {
            period: `Week of ${weekStart.toISOString().split('T')[0]}`,
            totalHours: 0, // Will be updated
          },
          createdAt: weekStart,
        },
      });
      weeklyClaimCount++;

      // Create claims for this weekly claim
      const numClaims = Math.floor(Math.random() * config.claimsPerWeeklyClaim) + 2;
      let totalHours = 0;

      for (let j = 0; j < numClaims; j++) {
        const hoursWorked = Math.floor(Math.random() * 8) + 1; // 1-8 hours
        totalHours += hoursWorked;

        const dayWorked = new Date(weekStart);
        dayWorked.setDate(dayWorked.getDate() + j);

        await prisma.claim.create({
          data: {
            wageId: wage.id,
            weeklyClaimId: weeklyClaim.id,
            hoursWorked,
            dayWorked,
            memo: faker.lorem.sentence(),
            createdAt: dayWorked,
          },
        });
        claimCount++;
      }

      // Update weekly claim with total hours
      await prisma.weeklyClaim.update({
        where: { id: weeklyClaim.id },
        data: {
          data: {
            period: `Week of ${weekStart.toISOString().split('T')[0]}`,
            totalHours,
          },
        },
      });
    }
  }

  console.log(`  ✓ Created ${weeklyClaimCount} weekly claims`);
  console.log(`  ✓ Created ${claimCount} claims`);
}

async function seedExpenses(teams: any[], config: SeedConfig) {
  console.log('\n💸 Seeding expenses...');

  const expenses = [];

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (let i = 0; i < config.expensesPerTeam; i++) {
      const member = teamMembers[Math.floor(Math.random() * teamMembers.length)];
      const amount = parseFloat((Math.random() * 500 + 50).toFixed(2));
      const status = randomStatus(['signed', 'expired', 'disabled']);

      expenses.push({
        userAddress: member.userAddress,
        teamId: team.id,
        signature: status === 'signed' ? faker.string.hexadecimal({ length: 130 }) : '',
        status,
        data: {
          amount,
          category: faker.helpers.arrayElement([
            'Travel',
            'Software',
            'Hardware',
            'Office',
            'Training',
          ]),
          description: faker.lorem.sentence(),
        },
        createdAt: distributeDate(i, config.expensesPerTeam),
      });
    }
  }

  await prisma.expense.createMany({ data: expenses });
  console.log(`  ✓ Created ${expenses.length} expenses`);
}

async function seedTeamContracts(teams: any[], config: SeedConfig) {
  console.log('\n📜 Seeding team contracts...');

  const contracts = [];

  for (const team of teams) {
    for (let i = 0; i < config.contractsPerTeam; i++) {
      const contractType = i === 0 ? 'InvestorV1' : 'CashRemunerationEIP712';
      contracts.push({
        teamId: team.id,
        type: contractType,
        address: faker.finance.ethereumAddress(),
        deployer: team.ownerAddress,
        createdAt: distributeDate(i, config.contractsPerTeam),
      });
    }
  }

  await prisma.teamContract.createMany({ data: contracts });
  console.log(`  ✓ Created ${contracts.length} team contracts`);
}

async function seedBoardActions(teams: any[], config: SeedConfig) {
  console.log('\n🎯 Seeding board of director actions...');

  const actions = [];

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (let i = 0; i < config.actionsPerTeam; i++) {
      const createdAt = distributeDate(i, config.actionsPerTeam);
      const isExecuted = Math.random() > 0.4;
      const targetMember = teamMembers[Math.floor(Math.random() * teamMembers.length)];

      actions.push({
        teamId: team.id,
        actionId: i + 1,
        userAddress: team.ownerAddress,
        targetAddress: targetMember.userAddress,
        description: faker.lorem.sentence(),
        data: JSON.stringify({
          actionType: faker.helpers.arrayElement([
            'ADD_MEMBER',
            'REMOVE_MEMBER',
            'UPDATE_WAGE',
            'APPROVE_EXPENSE',
          ]),
        }),
        isExecuted,
        createdAt,
      });
    }
  }

  await prisma.boardOfDirectorActions.createMany({ data: actions });
  console.log(`  ✓ Created ${actions.length} board actions`);
}

async function seedNotifications(users: any[], config: SeedConfig) {
  console.log('\n🔔 Seeding notifications...');

  const notifications = [];

  for (const user of users) {
    for (let i = 0; i < config.notificationsPerUser; i++) {
      const notifType = faker.helpers.arrayElement(['claim', 'expense', 'action', 'wage']);
      notifications.push({
        userAddress: user.address,
        subject: `${notifType.charAt(0).toUpperCase() + notifType.slice(1)} Update`,
        message: faker.lorem.sentence(),
        author: users[Math.floor(Math.random() * users.length)].address,
        resource: notifType,
        isRead: Math.random() > 0.5,
        createdAt: distributeDate(i, config.notificationsPerUser),
      });
    }
  }

  await prisma.notification.createMany({ data: notifications });
  console.log(`  ✓ Created ${notifications.length} notifications`);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const startTime = Date.now();
  console.log('🌱 Starting database seeding...');

  const env = (process.env.NODE_ENV || 'development') as Environment;
  console.log(`📍 Environment: ${env}`);

  if (env === 'production') {
    throw new Error('⚠️  PRODUCTION SEEDING BLOCKED: Seeds cannot run in production');
  }

  const config = CONFIGS[env];

  // Optional: Clear existing data
  if (process.env.CLEAR_DATA === 'true') {
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

  // Seed in correct order
  const users = await seedUsers(config, env);
  const teams = await seedTeams(config, users, env);
  const wages = await seedWages(teams, users, config);
  await seedWeeklyClaimsAndClaims(wages, config);
  await seedExpenses(teams, config);
  await seedTeamContracts(teams, config);
  await seedBoardActions(teams, config);
  await seedNotifications(users, config);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

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

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
