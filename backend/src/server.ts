import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import path from 'path';
import { env } from './config/environment';
import { logger } from './utils/logger';
import { disconnectDatabases, checkDatabaseHealth, checkRedisHealth, redis } from './config/database';
import { testBlockchainConnection, connection, getWallet } from './config/blockchain';
import type { HealthCheckResponse } from './types';

// Import routes
import { registerOrderRoutes } from './routes/orders';
import { registerWebSocketRoutes } from './routes/websocket';

// Import services
import { TransactionService, WebSocketManager, OrderProcessor } from './services';
import { DexRouter as MockDexRouter } from './services/dex-router-mock';
import { DexRouter as HybridDexRouter } from './services/dex-router-devnet-hybrid';

// Choose which router to use
type DexRouter = MockDexRouter | HybridDexRouter;

const fastify = Fastify({
  logger: logger,
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
  disableRequestLogging: true, // Disable HTTP request logs for cleaner demo output
  requestTimeout: 30000,
});

// Register CORS
fastify.register(cors, {
  origin: true, // Allow all origins for development
  credentials: true,
});

// Register static file serving for frontend
fastify.register(staticFiles, {
  root: path.join(__dirname, '../../frontend'),
  prefix: '/',
});

// Register WebSocket plugin
fastify.register(websocket, {
  options: {
    clientTracking: true,
    maxPayload: 1048576, // 1MB
  },
});

// Health check endpoint
fastify.get('/health', async (_request, reply) => {
  const [dbHealth, redisHealth, blockchainHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    testBlockchainConnection(),
  ]);

  const allHealthy = dbHealth && redisHealth && blockchainHealth;

  const response: HealthCheckResponse = {
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: Date.now(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      blockchain: blockchainHealth,
    },
    version: '1.0.0',
  };

  reply.code(allHealthy ? 200 : 503).send(response);
});

// Readiness probe
fastify.get('/ready', async (_request, reply) => {
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth) {
    reply.code(200).send({ status: 'ready' });
  } else {
    reply.code(503).send({ status: 'not ready' });
  }
});

// Liveness probe
fastify.get('/live', async (_request, reply) => {
  reply.code(200).send({ status: 'alive' });
});

// Initialize services (will be done in start function)
let services: {
  transactionService: TransactionService;
  dexRouter: DexRouter;
  wsManager: WebSocketManager;
  orderProcessor: OrderProcessor;
} | null = null;

// Register application routes
fastify.register(async (instance) => {
  // Decorate fastify with services
  instance.decorate('services', services);

  await registerOrderRoutes(instance);
}, { prefix: '/api/orders' });

fastify.register(async (instance) => {
  instance.decorate('services', services);

  await registerWebSocketRoutes(instance);
}, { prefix: '/ws' });

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  logger.error({ error, url: request.url, method: request.method }, 'Request error');

  const statusCode = error.statusCode || 500;
  const message = env.IS_PRODUCTION && statusCode === 500
    ? 'Internal server error'
    : error.message;

  reply.code(statusCode).send({
    error: {
      message,
      code: error.code || 'INTERNAL_ERROR',
      statusCode,
    },
    timestamp: Date.now(),
  });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Close order processor
    if (services?.orderProcessor) {
      await services.orderProcessor.close();
      logger.info('Order processor closed');
    }

    // Close WebSocket manager
    if (services?.wsManager) {
      services.wsManager.closeAll();
      logger.info('WebSocket manager closed');
    }

    await fastify.close();
    logger.info('Fastify server closed');

    await disconnectDatabases();
    logger.info('Databases disconnected');

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled rejection');
  process.exit(1);
});

// Start server
const start = async () => {
  try {
    // Test database connections
    const dbHealth = await checkDatabaseHealth();
    if (!dbHealth) {
      throw new Error('Database connection failed');
    }

    const redisHealth = await checkRedisHealth();
    if (!redisHealth) {
      throw new Error('Redis connection failed');
    }

    logger.info('All database connections established successfully');

    // Test blockchain connection
    const blockchainHealth = await testBlockchainConnection();
    if (!blockchainHealth) {
      logger.warn('Blockchain connection failed, but continuing startup');
    }

    // Initialize services
    logger.info('Initializing services...');

    const wallet = getWallet();
    const transactionService = new TransactionService(connection);

    // Initialize DEX Router based on environment variable
    // USE_REAL_DEX=true: Hybrid mode (REAL blockchain transactions on devnet + simulated pools)
    // USE_REAL_DEX=false: Mock mode (simulated everything, no real transactions)
    const dexRouter = env.USE_REAL_DEX
      ? new HybridDexRouter(connection, wallet, transactionService)
      : new MockDexRouter(connection, wallet, transactionService);

    logger.info({ useRealDex: env.USE_REAL_DEX }, 'Initializing DEX Router...', {
      mode: env.USE_REAL_DEX ? 'Hybrid (Real blockchain + simulated pools)' : 'Mock (Fully simulated)'
    });

    const wsManager = new WebSocketManager();
    const orderProcessor = new OrderProcessor(dexRouter, wsManager, redis);

    // Initialize DEX Router
    await dexRouter.initialize();
    logger.info({ useRealDex: env.USE_REAL_DEX }, 'DEX Router initialized');

    // Store services globally
    services = {
      transactionService,
      dexRouter,
      wsManager,
      orderProcessor,
    };

    logger.info('All services initialized successfully');

    // Start server
    await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(
      {
        port: env.PORT,
        nodeEnv: env.NODE_ENV,
      },
      'Server started successfully'
    );
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
