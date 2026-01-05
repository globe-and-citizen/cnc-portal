// backend/prisma/seeders/actions.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';
import { faker } from '@faker-js/faker';

export async function seedBoardActions(prisma: PrismaClient, teams: Team[], config: SeedConfig) {
  console.log('\n🎯 Seeding board of director actions...');

  const actions = [];

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (let i = 0; i < config.actionsPerTeam; i++) {
      const createdAt = distributeDate(i, config.actionsPerTeam);

      const isExecuted = faker.datatype.boolean(0.6); // ~60% true, ~40% false
      const targetMember = faker.helpers.arrayElement(teamMembers);

      actions.push({
        teamId: team.id,
        actionId: i + 1,
        userAddress: team.ownerAddress,
        targetAddress: targetMember.memberAddress,
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
