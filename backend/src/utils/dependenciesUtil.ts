import { PrismaClient } from '@prisma/client'

// Singleton pattern to ensure only one PrismaClient instance
class PrismaClientSingleton {
  private static instance: PrismaClient

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['info', 'warn', 'error'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })

      console.log('✅ New PrismaClient instance created')
    } else {
      console.log('♻️  Reusing existing PrismaClient instance')
    }

    return PrismaClientSingleton.instance
  }

  // Method to disconnect when shutting down
  public static async disconnect(): Promise<void> {
    if (PrismaClientSingleton.instance) {
      await PrismaClientSingleton.instance.$disconnect()
      console.log('🔌 PrismaClient disconnected')
    }
  }
}

export const prisma = PrismaClientSingleton.getInstance()
export const disconnectPrisma = PrismaClientSingleton.disconnect
