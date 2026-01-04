// backend/prisma/seeders/wages.ts

import { PrismaClient, Team } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { type SeedConfig } from './config';

// Available rate types
const RATE_TYPES = ['native', 'usdc', 'sher'] as const;

/**
 * Generates random rates per hour for different token types
 * Randomly selects 1-3 rate types (or none)
 * @returns Array of rate objects with type and amount
 */
function generateRates() {
  // Randomly select 1-3 rate types
  const rateCount = faker.number.int({ min: 1, max: 3 });
  const selectedTypes = faker.helpers.shuffle(RATE_TYPES).slice(0, rateCount);

  return selectedTypes.map((type) => ({
    type,
    amount: faker.number.float({ min: 5, max: 25, fractionDigits: 2 }), // 5-25 per hour
  }));
}

export async function seedWages(prisma: PrismaClient, teams: Team[], config: SeedConfig) {
  console.log('\n💰 Seeding wages...');

  const wages = [];
  let wageChainCount = 0;

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (const member of teamMembers) {
      // Randomly decide if this member should have wages (70% chance)
      if (faker.datatype.boolean({ probability: 0.7 })) {
        let previousWage = null;
        let previousWageDate = member.createdAt;

        for (let i = 0; i < config.wagesPerUser; i++) {
          const wageData: any = {
            teamId: team.id,
            userAddress: member.memberAddress,
            ratePerHour: generateRates(),
            maximumHoursPerWeek: faker.number.int({ min: 20, max: 50 }),
            createdAt: faker.date.between({
              from: previousWageDate,
              to: new Date(),
            }),
          };

          // Link to previous wage if it exists
          if (previousWage) {
            wageData.previousWage = {
              connect: { id: previousWage.id },
            };
            wageChainCount++;
          }

          const wage = await prisma.wage.create({
            data: wageData,
            include: {
              nextWage: true,
              previousWage: true,
            },
          });

          wages.push(wage);
          previousWage = wage;
          previousWageDate = wage.createdAt; // Update reference date for next wage
        }
      }
    }
  }

  console.log(`  ✓ Created ${wages.length} wages (${wageChainCount} chains)`);
  return wages;
}
