// backend/prisma/seeders/users.ts

import { PrismaClient } from '../../src/generated/prisma/client';
import { faker } from '@faker-js/faker';
import { type SeedConfig, type Environment } from './config';
import { getEthereumAddress, generateNonce, distributeDate } from './helpers';

export async function seedUsers(
  prisma: PrismaClient,
  config: SeedConfig,
  environment: Environment
) {
  console.log('\n👥 Seeding users...');

  const users = Array.from({ length: config.users }, (_, i) => ({
    address: getEthereumAddress(i, environment),
    name: environment === 'test' ? `User ${i + 1}` : faker.person.fullName(),
    nonce: generateNonce(),
    imageUrl: faker.image.avatar(),
    createdAt: distributeDate(i, config.users),
  }));

  await prisma.user.createMany({
    data: users,
    skipDuplicates: true,
  });

  const created = await prisma.user.findMany();
  console.log(`  ✓ Created ${created.length} users`);
  return created;
}
