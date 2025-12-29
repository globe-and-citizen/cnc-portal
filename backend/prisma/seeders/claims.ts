// backend/prisma/seeders/claims.ts

import { PrismaClient, Wage } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate, getMondayAtMidnight, getDateAtMidnight, randomStatus } from './helpers';
import { faker } from '@faker-js/faker';

// interface Wage {
//   id: string;
//   userAddress: string;
//   teamId: string;
// }

export async function seedWeeklyClaimsAndClaims(
  prisma: PrismaClient,
  wages: Wage[],
  config: SeedConfig
) {
  console.log('\n📋 Seeding weekly claims and claims...');

  let weeklyClaimCount = 0;
  let claimCount = 0;

  for (const wage of wages) {
    const numWeeklyClaims = Math.floor(Math.random() * config.weeklyClaimsPerUser) + 1;

    for (let i = 0; i < numWeeklyClaims; i++) {
      const randomDateValue = distributeDate(i, numWeeklyClaims);
      const weekStart = getMondayAtMidnight(randomDateValue);
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

        const claimDate = new Date(weekStart);
        claimDate.setDate(claimDate.getDate() + j);
        const dayWorked = getDateAtMidnight(claimDate);

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
