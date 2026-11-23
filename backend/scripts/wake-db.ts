import 'dotenv/config';
import { createPrismaAdapter } from '../src/utils/prismaAdapter';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function wakeDatabase() {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds

  console.log('🔌 Attempting to wake up database...');

  for (let i = 1; i <= maxRetries; i++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Database is awake and ready!');
      await prisma.$disconnect();
      return;
    } catch {
      console.log(`⏳ Attempt ${i}/${maxRetries} failed. Retrying in ${retryDelay / 1000}s...`);

      // Disconnect to prevent connection leaks before retrying
      await prisma.$disconnect();

      if (i === maxRetries) {
        console.error('❌ Failed to wake database after maximum retries');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

wakeDatabase().catch((err) => {
  console.error('❌ Unhandled error in wakeDatabase:', err);
  process.exit(1);
});
