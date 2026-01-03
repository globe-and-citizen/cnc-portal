// backend/prisma/seeders/claims.ts

import { PrismaClient, Wage } from '@prisma/client';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import { type SeedConfig } from './config';
import { faker } from '@faker-js/faker';

dayjs.extend(utc);
dayjs.extend(isoWeek);

export async function seedWeeklyClaimsAndClaims(
  prisma: PrismaClient,
  wages: Wage[],
  config: SeedConfig
) {
  console.log('\n📋 Seeding weekly claims and claims...');

  let weeklyClaimCount = 0;
  let claimCount = 0;

  for (const wage of wages) {
    // Use the nextWage relation already included in the wage object
    const nextWage = (wage as any).nextWage;

    // Weekly claims should be between current wage createdAt and next wage createdAt (or now)
    const wageStartDate = wage.createdAt;
    const wageEndDate = nextWage?.createdAt || new Date();

    // Track weeks that have already been created for this wage to avoid duplicates
    const createdWeeks = new Set<string>();

    const numWeeklyClaims = faker.number.int({ min: 1, max: config.weeklyClaimsPerUser });

    for (let i = 0; i < numWeeklyClaims; i++) {
      let weekStart: Date | null = null;
      let weekKey: string | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      // Try up to 3 times to generate a unique week
      while (retryCount < maxRetries && !weekStart) {
        const randomDateValue = faker.date.between({
          from: wageStartDate,
          to: wageEndDate,
        });

        const generatedWeekStart = dayjs.utc(randomDateValue).startOf('isoWeek').toDate();
        const generatedWeekKey = generatedWeekStart.toISOString();

        // If this week hasn't been created yet, use it
        if (!createdWeeks.has(generatedWeekKey)) {
          weekStart = generatedWeekStart;
          weekKey = generatedWeekKey;
          break;
        }

        retryCount++;
      }

      // Skip if we couldn't find a unique week after 3 retries
      if (!weekStart || !weekKey) {
        continue;
      }

      const status = faker.helpers.arrayElement(['pending', 'approved', 'rejected']);

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
      createdWeeks.add(weekKey);

      // Create claims for this weekly claim
      const numClaims = faker.number.int({ min: 2, max: config.claimsPerWeeklyClaim });
      let totalHours = 0;

      for (let j = 0; j < numClaims; j++) {
        const hoursWorked = faker.number.int({ min: 1, max: 8 });
        totalHours += hoursWorked;

        const claimDate = new Date(weekStart);
        claimDate.setDate(claimDate.getDate() + j);
        const dayWorked = dayjs.utc(claimDate).startOf('day').toDate();

        await prisma.claim.create({
          data: {
            wageId: wage.id,
            weeklyClaimId: weeklyClaim.id,
            hoursWorked,
            dayWorked,
            memo: faker.lorem.sentence({ min: 10, max: 200 }),
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
