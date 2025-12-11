import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

      if (i === maxRetries) {
        console.error('❌ Failed to wake database after maximum retries');
        await prisma.$disconnect();
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

wakeDatabase();
