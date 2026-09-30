import { PrismaClient } from '@prisma/client';
import { generateNonce } from 'siwe';

const prisma = new PrismaClient();

const E2E_ACTORS = [
  {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    name: 'E2E Owner',
    roles: ['ROLE_USER', 'ROLE_ADMIN'],
  },
  {
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    name: 'E2E Member',
    roles: ['ROLE_USER'],
  },
  {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    name: 'E2E New Signer',
    roles: ['ROLE_USER'],
  },
] as const;

async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('The integrated E2E seed only runs with NODE_ENV=test');
  }

  await prisma.$transaction(
    E2E_ACTORS.map((actor) =>
      prisma.user.upsert({
        where: { address: actor.address },
        create: {
          address: actor.address,
          name: actor.name,
          nonce: generateNonce(),
          roles: [...actor.roles],
        },
        update: {
          name: actor.name,
          roles: [...actor.roles],
        },
      })
    )
  );

  console.log(`Seeded ${E2E_ACTORS.length} deterministic integrated E2E actors`);
}

main()
  .catch((error) => {
    console.error('Integrated E2E seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
