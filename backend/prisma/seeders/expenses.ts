// backend/prisma/seeders/expenses.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate, randomStatus } from './helpers';
import { faker } from '@faker-js/faker';

// interface Team {
//   id: string;
// }

export async function seedExpenses(
  prisma: PrismaClient,
  teams: Team[],
  config: SeedConfig
) {
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
