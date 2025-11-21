import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { env } from './environment';
import { logger } from '../utils/logger';

// Prisma Client Singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'], // Only log errors for cleaner demo output
  });

if (env.IS_DEVELOPMENT) globalForPrisma.prisma = prisma;

// Redis Client for Queue and Cache
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    logger.error({ err }, 'Redis reconnect on error');
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

redis.on('close', () => {
  logger.warn('Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Graceful shutdown handlers
export async function disconnectDatabases() {
  logger.info('Disconnecting from databases...');

  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting Prisma');
  }

  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting Redis');
  }
}

// Health check functions
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ error }, 'Redis health check failed');
    return false;
  }
}
