// Jest setup file
import { prisma } from '../config/database';
import { redis } from '../config/database';

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for blockchain tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

// Mock logger in tests to reduce noise
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));
