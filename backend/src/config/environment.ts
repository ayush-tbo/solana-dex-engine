import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  WS_PORT: z.string().default('3001'),

  // Database
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),

  // Blockchain
  RPC_URL: z.string().url(),
  HELIUS_API_KEY: z.string().optional(),
  SOLANA_PRIVATE_KEY: z.string(),

  // Queue
  BULL_BOARD_USERNAME: z.string().default('admin'),
  BULL_BOARD_PASSWORD: z.string().default('admin123'),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // API Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),

  // Order Processing
  MAX_CONCURRENT_ORDERS: z.string().default('10'),
  MAX_ORDERS_PER_MINUTE: z.string().default('100'),
  ORDER_RETRY_ATTEMPTS: z.string().default('3'),
  ORDER_TIMEOUT_MS: z.string().default('30000'),

  // Slippage Configuration
  DEFAULT_SLIPPAGE: z.string().default('0.01'),
  MAX_SLIPPAGE: z.string().default('0.05'),

  // Priority Fees
  PRIORITY_FEE_MICRO_LAMPORTS: z.string().default('50000'),
  COMPUTE_UNIT_LIMIT: z.string().default('400000'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = {
  // Server
  NODE_ENV: parsedEnv.data.NODE_ENV,
  PORT: parseInt(parsedEnv.data.PORT, 10),
  WS_PORT: parseInt(parsedEnv.data.WS_PORT, 10),

  // Database
  DATABASE_URL: parsedEnv.data.DATABASE_URL,
  REDIS_URL: parsedEnv.data.REDIS_URL,

  // Blockchain
  RPC_URL: parsedEnv.data.RPC_URL,
  HELIUS_API_KEY: parsedEnv.data.HELIUS_API_KEY,
  SOLANA_PRIVATE_KEY: parsedEnv.data.SOLANA_PRIVATE_KEY,

  // Queue
  BULL_BOARD_USERNAME: parsedEnv.data.BULL_BOARD_USERNAME,
  BULL_BOARD_PASSWORD: parsedEnv.data.BULL_BOARD_PASSWORD,

  // Logging
  LOG_LEVEL: parsedEnv.data.LOG_LEVEL,
  LOG_FORMAT: parsedEnv.data.LOG_FORMAT,

  // API Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(parsedEnv.data.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(parsedEnv.data.RATE_LIMIT_MAX_REQUESTS, 10),

  // Order Processing
  MAX_CONCURRENT_ORDERS: parseInt(parsedEnv.data.MAX_CONCURRENT_ORDERS, 10),
  MAX_ORDERS_PER_MINUTE: parseInt(parsedEnv.data.MAX_ORDERS_PER_MINUTE, 10),
  ORDER_RETRY_ATTEMPTS: parseInt(parsedEnv.data.ORDER_RETRY_ATTEMPTS, 10),
  ORDER_TIMEOUT_MS: parseInt(parsedEnv.data.ORDER_TIMEOUT_MS, 10),

  // Slippage Configuration
  DEFAULT_SLIPPAGE: parseFloat(parsedEnv.data.DEFAULT_SLIPPAGE),
  MAX_SLIPPAGE: parseFloat(parsedEnv.data.MAX_SLIPPAGE),

  // Priority Fees
  PRIORITY_FEE_MICRO_LAMPORTS: parseInt(parsedEnv.data.PRIORITY_FEE_MICRO_LAMPORTS, 10),
  COMPUTE_UNIT_LIMIT: parseInt(parsedEnv.data.COMPUTE_UNIT_LIMIT, 10),

  // Helper
  IS_PRODUCTION: parsedEnv.data.NODE_ENV === 'production',
  IS_DEVELOPMENT: parsedEnv.data.NODE_ENV === 'development',
  IS_TEST: parsedEnv.data.NODE_ENV === 'test',
};
