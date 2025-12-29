// backend/prisma/seeders/wages.ts

import { PrismaClient, Team } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';

// interface Team {
//   id: string;
// }

// interface User {
//   address: string;
// }

export async function seedWages(
  prisma: PrismaClient,
  teams: Team[],
  config: SeedConfig
) {
  console.log('\n💰 Seeding wages...');

  const wages = [];
  let wageChainCount = 0;

  for (const team of teams) {
    const teamMembers = await prisma.memberTeamsData.findMany({
      where: { teamId: team.id },
    });

    for (const member of teamMembers) {
      let previousWage = null;

      for (let i = 0; i < config.wagesPerUser; i++) {
        const baseRate = 20 + Math.random() * 30; // $20-50/hr
        const wageData: any = {
          teamId: team.id,
          userAddress: member.userAddress,
          cashRatePerHour: parseFloat((baseRate * (1 + i * 0.1)).toFixed(2)),
          tokenRatePerHour: parseFloat((baseRate * 0.5).toFixed(2)),
          usdcRatePerHour: parseFloat((baseRate * 0.8).toFixed(2)),
          maximumHoursPerWeek: 40,
          createdAt: new Date(member.createdAt.getTime() + i * 60 * 24 * 60 * 60 * 1000),
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
        });

        wages.push(wage);
        previousWage = wage;
      }
    }
  }

  console.log(`  ✓ Created ${wages.length} wages (${wageChainCount} chains)`);
  return wages;
}
