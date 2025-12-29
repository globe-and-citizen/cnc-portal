// backend/prisma/seeders/contracts.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';
import { faker } from '@faker-js/faker';

    // interface Team {`
    //   id: string;
    //   own`erAddress: string;
// }?

export async function seedTeamContracts(
  prisma: PrismaClient,
  teams: Team[],
  config: SeedConfig
) {
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
