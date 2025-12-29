// backend/prisma/seeders/contracts.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';
import { faker } from '@faker-js/faker';

// All available contract types from validation schema
const CONTRACT_TYPES = [
  'Bank',
  'InvestorV1',
  'Voting',
  'BoardOfDirectors',
  'ExpenseAccount',
  'ExpenseAccountEIP712',
  'CashRemunerationEIP712',
  'Campaign',
] as const;

export async function seedTeamContracts(
  prisma: PrismaClient,
  teams: Team[],
  config: SeedConfig
) {
  console.log('\n📜 Seeding team contracts...');

  const contracts = [];

  for (const team of teams) {
    // Create one contract of each type for every team
    CONTRACT_TYPES.forEach((contractType, index) => {
      contracts.push({
        teamId: team.id,
        type: contractType,
        address: faker.finance.ethereumAddress(),
        deployer: team.ownerAddress,
        createdAt: distributeDate(index, CONTRACT_TYPES.length),
      });
    });
  }

  await prisma.teamContract.createMany({ data: contracts });
  console.log(`  ✓ Created ${contracts.length} team contracts (${CONTRACT_TYPES.length} types per team)`);
}
