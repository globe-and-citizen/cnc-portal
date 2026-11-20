import { PrismaPg } from '@prisma/adapter-pg';

export function createPrismaAdapter(): PrismaPg {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const connectionString = process.env.DATABASE_URL;
  const schema = new URL(connectionString).searchParams.get('schema') ?? undefined;
  return new PrismaPg({ connectionString }, { schema });
}
