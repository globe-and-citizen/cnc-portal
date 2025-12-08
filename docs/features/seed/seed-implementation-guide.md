# Database Seeding - Implementation Guide

**Version:** 1.0.0  
**Date:** December 8, 2025  
**Audience:** Backend Developers, Database Administrators

This guide provides detailed implementation instructions for the CNC Portal database seeding feature.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Complete Seed Implementation](#2-complete-seed-implementation)
3. [Helper Functions Library](#3-helper-functions-library)
4. [Modular Seed Functions](#4-modular-seed-functions)
5. [Testing Seeds](#5-testing-seeds)
6. [Troubleshooting](#6-troubleshooting)
7. [Best Practices](#7-best-practices)

---

## 1. Quick Start

### 1.1 Setup

```bash
# Install dependencies
cd backend
npm install @faker-js/faker --save-dev

# Configure package.json
npm pkg set 'prisma.seed'='tsx prisma/seed.ts'

# Add scripts
npm pkg set 'scripts.seed'='tsx prisma/seed.ts'
npm pkg set 'scripts.seed:dev'='NODE_ENV=development tsx prisma/seed.ts'
npm pkg set 'scripts.seed:test'='NODE_ENV=test tsx prisma/seed.ts'
npm pkg set 'scripts.seed:reset'='npx prisma migrate reset --force'
```

### 1.2 Create Seed File

Create `backend/prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  
  const env = process.env.NODE_ENV || 'development';
  console.log(`📍 Environment: ${env}`);
  
  if (env === 'production') {
    throw new Error('⚠️  Cannot seed production database!');
  }
  
  // TODO: Implement seeding logic
  
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 1.3 Run Seeds

```bash
# Run with default environment (development)
npm run seed

# Run in test environment
NODE_ENV=test npm run seed

# Reset and reseed
npm run seed:reset
```

---

## 2. Complete Seed Implementation

Here's a complete, production-ready seed.ts implementation:

```typescript
// backend/prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';
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
  
  const teams = Array.from({ length: config.teams }, (_, i) => ({
    name: environment === 'test' ? `Team ${i + 1}` : faker.company.name(),
    description: faker.company.catchPhrase(),
    ownerAddress: users[i % users.length].address,
    officerAddress: users[(i + 1) % users.length].address,
    createdAt: distributeDate(i, config.teams),
  }));
  
  const createdTeams = [];
  for (const team of teams) {
    const created = await prisma.team.create({ data: team });
    createdTeams.push(created);
  }
  
  console.log(`  ✓ Created ${createdTeams.length} teams`);
  return createdTeams;
}

async function seedMemberTeamsData(teams: any[], users: any[], config: SeedConfig) {
  console.log('\n👥 Seeding team memberships...');
  
  const memberships = [];
  for (const team of teams) {
    // Add owner as member
    memberships.push({
      teamId: team.id,
      userAddress: team.ownerAddress,
      createdAt: team.createdAt,
    });
    
    // Add additional members
    const memberCount = Math.min(config.membersPerTeam - 1, users.length - 1);
    const availableUsers = users.filter(u => u.address !== team.ownerAddress);
    const selectedUsers = availableUsers.slice(0, memberCount);
    
    for (const user of selectedUsers) {
      memberships.push({
        teamId: team.id,
        userAddress: user.address,
        createdAt: new Date(team.createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      });
    }
  }
  
  await prisma.memberTeamsData.createMany({
    data: memberships,
    skipDuplicates: true,
  });
  
  console.log(`  ✓ Created ${memberships.length} team memberships`);
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
  const ranges = getDateRanges();
  
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

async function seedExpenses(teams: any[], users: any[], config: SeedConfig) {
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
          category: faker.helpers.arrayElement(['Travel', 'Software', 'Hardware', 'Office', 'Training']),
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
        contractType,
        contractAddress: faker.finance.ethereumAddress(),
        chainId: '1337',
        isActive: Math.random() > 0.2,
        createdAt: distributeDate(i, config.contractsPerTeam),
      });
    }
  }
  
  await prisma.teamContract.createMany({ data: contracts });
  console.log(`  ✓ Created ${contracts.length} team contracts`);
}

async function seedBoardActions(teams: any[], users: any[], config: SeedConfig) {
  console.log('\n🎯 Seeding board of director actions...');
  
  const actions = [];
  
  for (const team of teams) {
    for (let i = 0; i < config.actionsPerTeam; i++) {
      const createdAt = distributeDate(i, config.actionsPerTeam);
      const isExecuted = Math.random() > 0.4;
      
      actions.push({
        teamId: team.id,
        initiatorAddress: team.ownerAddress,
        actionType: faker.helpers.arrayElement(['ADD_MEMBER', 'REMOVE_MEMBER', 'UPDATE_WAGE', 'APPROVE_EXPENSE']),
        description: faker.lorem.sentence(),
        status: isExecuted ? 'executed' : 'pending',
        executedAt: isExecuted ? new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
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
      notifications.push({
        userAddress: user.address,
        type: faker.helpers.arrayElement(['claim', 'expense', 'action', 'wage']),
        title: faker.lorem.sentence(5),
        message: faker.lorem.sentence(),
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
  await seedMemberTeamsData(teams, users, config);
  const wages = await seedWages(teams, users, config);
  await seedWeeklyClaimsAndClaims(wages, config);
  await seedExpenses(teams, users, config);
  await seedTeamContracts(teams, config);
  await seedBoardActions(teams, users, config);
  await seedNotifications(users, config);
  
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
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 3. Helper Functions Library

Create `backend/prisma/seeds/helpers.ts`:

```typescript
import { faker } from '@faker-js/faker';

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function randomStatus<T extends string>(statuses: T[]): T {
  return statuses[Math.floor(Math.random() * statuses.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function getDateRanges() {
  const now = new Date();
  return {
    now,
    last7d: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    last30d: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    last90d: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    lastYear: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
  };
}

export function distributeDate(index: number, total: number): Date {
  const ranges = getDateRanges();
  
  // 30% in last 7 days, 40% in last 30 days, 20% in last 90 days, 10% older
  const ratio = index / total;
  if (ratio < 0.3) {
    return randomDate(ranges.last7d, ranges.now);
  } else if (ratio < 0.7) {
    return randomDate(ranges.last30d, ranges.last7d);
  } else if (ratio < 0.9) {
    return randomDate(ranges.last90d, ranges.last30d);
  } else {
    return randomDate(ranges.lastYear, ranges.last90d);
  }
}

export function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function generateEthereumAddress(): string {
  return faker.finance.ethereumAddress();
}

export const HARDHAT_ADDRESSES = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
];
```

---

## 4. Modular Seed Functions

For better organization, split seed functions into separate files:

### 4.1 User Seeds

Create `backend/prisma/seeds/users.seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { generateNonce, distributeDate, HARDHAT_ADDRESSES } from './helpers';

export async function seedUsers(
  prisma: PrismaClient,
  count: number,
  environment: string
) {
  console.log(`\n👥 Seeding ${count} users...`);
  
  const users = Array.from({ length: count }, (_, i) => {
    let address: string;
    
    if (environment === 'test') {
      address = HARDHAT_ADDRESSES[i % HARDHAT_ADDRESSES.length];
    } else if (environment === 'development' && i < HARDHAT_ADDRESSES.length) {
      address = HARDHAT_ADDRESSES[i];
    } else {
      address = faker.finance.ethereumAddress();
    }
    
    return {
      address,
      name: environment === 'test' ? `User ${i + 1}` : faker.person.fullName(),
      nonce: generateNonce(),
      imageUrl: faker.image.avatar(),
      createdAt: distributeDate(i, count),
    };
  });
  
  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });
  
  const created = await prisma.user.findMany();
  console.log(`  ✓ Created ${created.length} users`);
  
  return created;
}
```

### 4.2 Team Seeds

Create `backend/prisma/seeds/teams.seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { distributeDate } from './helpers';

export async function seedTeams(
  prisma: PrismaClient,
  users: any[],
  count: number,
  environment: string
) {
  console.log(`\n🏢 Seeding ${count} teams...`);
  
  const teams = Array.from({ length: count }, (_, i) => ({
    name: environment === 'test' ? `Team ${i + 1}` : faker.company.name(),
    description: faker.company.catchPhrase(),
    ownerAddress: users[i % users.length].address,
    officerAddress: users[(i + 1) % users.length].address,
    createdAt: distributeDate(i, count),
  }));
  
  const createdTeams = [];
  for (const team of teams) {
    const created = await prisma.team.create({ data: team });
    createdTeams.push(created);
  }
  
  console.log(`  ✓ Created ${createdTeams.length} teams`);
  return createdTeams;
}
```

---

## 5. Testing Seeds

### 5.1 Manual Testing

```bash
# Seed test environment
NODE_ENV=test npm run seed

# Verify data in Prisma Studio
npx prisma studio

# Check counts
npx prisma db execute --stdin <<< "
SELECT 'users' as table_name, COUNT(*) as count FROM \"User\"
UNION ALL
SELECT 'teams', COUNT(*) FROM \"Team\"
UNION ALL
SELECT 'claims', COUNT(*) FROM \"Claim\";
"
```

### 5.2 Automated Tests

Create `backend/src/__tests__/seed.test.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

describe('Database Seeding', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    execSync('npm run seed', { stdio: 'inherit' });
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  it('should create correct number of test users', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(3);
  });
  
  it('should create correct number of test teams', async () => {
    const count = await prisma.team.count();
    expect(count).toBe(2);
  });
  
  it('should maintain referential integrity', async () => {
    const teams = await prisma.team.findMany({
      include: { owner: true },
    });
    
    teams.forEach(team => {
      expect(team.owner).toBeDefined();
      expect(team.ownerAddress).toBe(team.owner.address);
    });
  });
  
  it('should distribute dates correctly', async () => {
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentClaims = await prisma.claim.count({
      where: { createdAt: { gte: last7d } },
    });
    
    expect(recentClaims).toBeGreaterThan(0);
  });
});
```

---

## 6. Troubleshooting

### 6.1 Common Issues

**Issue: Foreign key constraint violation**

```text
Error: Foreign key constraint failed on the field: `teamId`
```

**Solution:**

- Ensure parent records are created first
- Check seeding order
- Verify IDs are being passed correctly

```typescript
// ❌ Wrong: Creating claim before wage
await prisma.claim.create({ data: { wageId: 999 } });

// ✅ Correct: Create wage first, use its ID
const wage = await prisma.wage.create({ data: wageData });
await prisma.claim.create({ data: { wageId: wage.id } });
```

---

**Issue: Duplicate key error**

```text
Error: Unique constraint failed on the field: `address`
```

**Solution:**

- Use `skipDuplicates: true` in createMany
- Use `upsert` for records that might exist
- Clear data before seeding

```typescript
// Use skipDuplicates
await prisma.user.createMany({
  data: users,
  skipDuplicates: true,
});

// Or use upsert
await prisma.user.upsert({
  where: { address: user.address },
  update: {},
  create: user,
});
```

---

**Issue: Inconsistent test results**

**Solution:**

- Use fixed data in test environment
- Avoid Math.random() in tests
- Set explicit dates instead of relative dates

```typescript
// ❌ Bad: Random in tests
if (env === 'test') {
  return Math.random() > 0.5 ? 'approved' : 'pending';
}

// ✅ Good: Deterministic in tests
if (env === 'test') {
  return index % 2 === 0 ? 'approved' : 'pending';
}
```

---

## 7. Best Practices

### 7.1 Do's

✅ **Use transactions for related entities**

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const team = await tx.team.create({ data: { ...teamData, ownerAddress: user.address } });
});
```

✅ **Log progress clearly**

```typescript
console.log('👥 Seeding users...');
console.log(`  ✓ Created ${count} users`);
```

✅ **Validate critical data**

```typescript
if (!validateEthereumAddress(address)) {
  throw new Error(`Invalid address: ${address}`);
}
```

✅ **Use bulk operations**

```typescript
await prisma.user.createMany({ data: users });
```

✅ **Make seeds idempotent**

```typescript
await prisma.user.upsert({
  where: { address },
  update: {},
  create: userData,
});
```

### 7.2 Don'ts

❌ **Don't seed production**

```typescript
if (process.env.NODE_ENV === 'production') {
  throw new Error('Cannot seed production!');
}
```

❌ **Don't create records individually in loops**

```typescript
// Slow
for (const user of users) {
  await prisma.user.create({ data: user });
}

// Fast
await prisma.user.createMany({ data: users });
```

❌ **Don't ignore foreign key order**

```typescript
// Wrong order
await seedClaims();
await seedWages(); // Claims need wages!

// Correct order
await seedWages();
await seedClaims();
```

❌ **Don't use random data in tests**

```typescript
// Bad: Different data each run
name: faker.person.fullName()

// Good: Predictable data
name: `User ${index + 1}`
```

---

## 8. Advanced Patterns

### 8.1 Conditional Seeding

```typescript
// Seed only specific entities
const entitiesToSeed = process.env.SEED_ENTITIES?.split(',') || ['all'];

if (entitiesToSeed.includes('all') || entitiesToSeed.includes('users')) {
  await seedUsers();
}

if (entitiesToSeed.includes('all') || entitiesToSeed.includes('teams')) {
  await seedTeams();
}
```

### 8.2 Incremental Seeding

```typescript
// Add more data without clearing
const existingUsers = await prisma.user.count();
if (existingUsers < config.users) {
  const additionalUsers = config.users - existingUsers;
  await seedAdditionalUsers(additionalUsers);
}
```

### 8.3 Seed Verification

```typescript
async function verifySeed() {
  const checks = [
    { name: 'Users', expected: 10, actual: await prisma.user.count() },
    { name: 'Teams', expected: 5, actual: await prisma.team.count() },
    { name: 'Claims', expected: 100, actual: await prisma.claim.count() },
  ];
  
  checks.forEach(check => {
    const status = check.actual === check.expected ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.actual}/${check.expected}`);
  });
}
```

---

**End of Implementation Guide**

For more information, see:

- [Functional Specification](./functional-specification.md)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Faker.js Documentation](https://fakerjs.dev)
