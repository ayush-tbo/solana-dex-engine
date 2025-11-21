import 'fastify';
import type { TransactionService, WebSocketManager, OrderProcessor } from '../services';
import type { DexRouter as MockDexRouter } from '../services/dex-router-mock';
import type { DexRouter as HybridDexRouter } from '../services/dex-router-devnet-hybrid';

declare module 'fastify' {
  interface FastifyInstance {
    services: {
      transactionService: TransactionService;
      dexRouter: MockDexRouter | HybridDexRouter;
      wsManager: WebSocketManager;
      orderProcessor: OrderProcessor;
    } | null;
  }
}
