import 'fastify';
import type { TransactionService, WebSocketManager, OrderProcessor } from '../services';
// Use mock DEX router type for now (switch to real implementation later)
import type { DexRouter } from '../services/dex-router-mock';

declare module 'fastify' {
  interface FastifyInstance {
    services: {
      transactionService: TransactionService;
      dexRouter: DexRouter;
      wsManager: WebSocketManager;
      orderProcessor: OrderProcessor;
    } | null;
  }
}
