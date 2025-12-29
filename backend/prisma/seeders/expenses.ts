// backend/prisma/seeders/expenses.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
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
      const member = faker.helpers.arrayElement(teamMembers);
      const amount = faker.number.float({ min: 50, max: 550, fractionDigits: 2 });
      const status = faker.helpers.arrayElement(['signed', 'expired', 'disabled']);

      // Expense created after member joined the team
      const createdAt = faker.date.between({
        from: member.createdAt,
        to: new Date(),
      });

      expenses.push({
        userAddress: member.memberAddress,
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
        createdAt,
      });
    }
  }

  await prisma.expense.createMany({ data: expenses });
  console.log(`  ✓ Created ${expenses.length} expenses`);
}
