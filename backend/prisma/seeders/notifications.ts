// backend/prisma/seeders/notifications.ts

import { PrismaClient, User } from '@prisma/client';
import { type SeedConfig } from './config';
import { distributeDate } from './helpers';
import { faker } from '@faker-js/faker';

export async function seedNotifications(prisma: PrismaClient, users: User[], config: SeedConfig) {
  console.log('\n🔔 Seeding notifications...');

  const notifications = [];

  for (const user of users) {
    for (let i = 0; i < config.notificationsPerUser; i++) {
      const notifType = faker.helpers.arrayElement(['claim', 'expense', 'action', 'wage']);
      notifications.push({
        userAddress: user.address,
        subject: `${notifType.charAt(0).toUpperCase() + notifType.slice(1)} Update`,
        message: faker.lorem.sentence(),
        author: faker.helpers.arrayElement(users).address,
        resource: notifType,
        isRead: faker.datatype.boolean({ probability: 0.5 }),
        createdAt: distributeDate(i, config.notificationsPerUser),
      });
    }
  }
}
