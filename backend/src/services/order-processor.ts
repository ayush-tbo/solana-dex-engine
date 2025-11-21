import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { OrderStatus, DexType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { DexRouter as MockDexRouter } from './dex-router-mock';
import { DexRouter as HybridDexRouter } from './dex-router-devnet-hybrid';
import { WebSocketManager } from './websocket-manager';
import { env } from '../config/environment';
import type { OrderJobData, OrderStatusUpdate } from '../types';

// Type alias for DexRouter (all implementations share the same interface)
type DexRouter = MockDexRouter | HybridDexRouter;

export class OrderProcessor {
  private orderQueue: Queue<OrderJobData>;
  private queueEvents: QueueEvents;
  private worker!: Worker<OrderJobData>;

  constructor(
    private dexRouter: DexRouter,
    private wsManager: WebSocketManager,
    private redis: Redis
  ) {
    // Initialize queue
    this.orderQueue = new Queue<OrderJobData>('order-processing', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // Keep for 24 hours
        },
        removeOnFail: {
          count: 1000, // Keep last 1000 failed jobs
        },
        attempts: env.ORDER_RETRY_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    // Initialize queue events
    this.queueEvents = new QueueEvents('order-processing', { connection: redis });

    // Setup worker
    this.setupWorker();

    // Setup event handlers
    this.setupEventHandlers();

    logger.info('Order Processor initialized');
  }

  /**
   * Submit a new order to the queue
   */
  async submitOrder(orderData: OrderJobData): Promise<string> {
    logger.info({ orderId: orderData.orderId }, 'Submitting order to queue');

    const job = await this.orderQueue.add('process-order', orderData, {
      jobId: orderData.orderId,
      priority: 1, // Higher priority for market orders
    });

    logger.info({ orderId: orderData.orderId, jobId: job.id }, 'Order submitted to queue');

    return job.id!;
  }

  /**
   * Setup the worker to process orders
   */
  private setupWorker(): void {
    this.worker = new Worker<OrderJobData>(
      'order-processing',
      async (job: Job<OrderJobData>) => {
        const { orderId, tokenIn, tokenOut, amount, slippage } = job.data;

        logger.info({ orderId, jobId: job.id }, 'Processing order');

        try {
          // Step 1: Update status to ROUTING
          await this.updateOrderStatus(orderId, OrderStatus.ROUTING, {
            message: 'Fetching quotes from DEXs',
          });

          // Small delay to ensure WebSocket message is sent
          await new Promise(resolve => setTimeout(resolve, 500));

          // Step 2: Get quotes from DEXs
          const quotes = await this.dexRouter.getQuotes(tokenIn, tokenOut, BigInt(amount));

          // Log all quotes for demo visibility
          logger.info({ orderId }, '📊 Comparing DEX quotes:');
          quotes.forEach(quote => {
            logger.info({
              orderId,
              dex: quote.dex,
              outputAmount: quote.outputAmount.toString(),
              price: quote.price.toFixed(6),
              fee: `${(quote.fee * 100).toFixed(2)}%`
            }, `  ${quote.dex} quote`);
          });

          // Step 3: Select best quote
          const bestQuote = this.dexRouter.selectBestQuote(quotes);

          if (!bestQuote) {
            throw new Error('No valid quotes available');
          }

          logger.info({
            orderId,
            selectedDex: bestQuote.dex,
            price: bestQuote.price.toFixed(6),
            outputAmount: bestQuote.outputAmount.toString()
          }, `✅ Selected ${bestQuote.dex} (best price)`);

          // Save quote history
          await this.saveQuoteHistory(orderId, quotes, bestQuote);

          // Step 4: Update status to BUILDING
          await this.updateOrderStatus(orderId, OrderStatus.BUILDING, {
            selectedDex: bestQuote.dex,
            estimatedPrice: bestQuote.price,
            estimatedOutput: bestQuote.outputAmount.toString(),
          });

          // Small delay to ensure WebSocket message is sent
          await new Promise(resolve => setTimeout(resolve, 500));

          // Step 5: Execute swap
          const result = await this.dexRouter.executeSwap(bestQuote, slippage);

          logger.info({ orderId, txHash: result.signature }, 'Swap executed successfully');

          // Step 6: Update status to SUBMITTED
          await this.updateOrderStatus(orderId, OrderStatus.SUBMITTED, {
            signature: result.signature,
          });

          // Small delay to ensure WebSocket message is sent
          await new Promise(resolve => setTimeout(resolve, 500));

          // Step 7: Transaction is confirmed (already waited in executeSwap)
          // Update status to CONFIRMED
          await this.updateOrderStatus(orderId, OrderStatus.CONFIRMED, {
            txHash: result.signature,
            executedPrice: result.executedPrice,
            executedAmount: result.executedAmount.toString(),
            dex: result.dex,
          });

          // Update database with final results
          await prisma.order.update({
            where: { orderId },
            data: {
              status: OrderStatus.CONFIRMED,
              selectedDex: result.dex,
              executedPrice: result.executedPrice,
              amountOut: result.executedAmount,
              txHash: result.signature,
              updatedAt: new Date(),
            },
          });

          logger.info({ orderId, txHash: result.signature }, 'Order completed successfully');

          return {
            success: true,
            signature: result.signature,
            executedPrice: result.executedPrice,
          };
        } catch (error) {
          logger.error({ error, orderId, attempt: job.attemptsMade }, 'Order processing failed');

          // Update order status to FAILED
          await this.updateOrderStatus(orderId, OrderStatus.FAILED, {
            error: error instanceof Error ? error.message : 'Unknown error',
            retryCount: job.attemptsMade,
          });

          // Update database
          await prisma.order.update({
            where: { orderId },
            data: {
              status: OrderStatus.FAILED,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              retryCount: job.attemptsMade,
              updatedAt: new Date(),
            },
          });

          throw error; // Re-throw to let BullMQ handle retries
        }
      },
      {
        connection: this.redis,
        concurrency: env.MAX_CONCURRENT_ORDERS, // Process 10 orders concurrently
        limiter: {
          max: env.MAX_ORDERS_PER_MINUTE, // 100 orders per minute
          duration: 60000,
        },
      }
    );

    logger.info(
      {
        concurrency: env.MAX_CONCURRENT_ORDERS,
        rateLimit: `${env.MAX_ORDERS_PER_MINUTE}/min`,
      },
      'Worker started'
    );
  }

  /**
   * Update order status and broadcast via WebSocket
   */
  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    data: Record<string, any>
  ): Promise<void> {
    logger.info({ orderId, status, data }, 'Updating order status');

    // Update database
    await prisma.order.update({
      where: { orderId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    // Broadcast via WebSocket
    const statusUpdate: OrderStatusUpdate = {
      type: status,
      data,
    };

    this.wsManager.broadcastOrderUpdate(orderId, statusUpdate);
  }

  /**
   * Save quote history to database
   */
  private async saveQuoteHistory(orderId: string, quotes: any[], bestQuote: any): Promise<void> {
    try {
      const quoteRecords = quotes.map((quote) => ({
        orderId,
        dex: quote.dex as DexType,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        price: quote.price,
        fee: quote.fee,
        poolId: quote.poolId,
        wasSelected: quote === bestQuote,
      }));

      await prisma.quoteHistory.createMany({
        data: quoteRecords,
      });

      logger.debug({ orderId, quoteCount: quoteRecords.length }, 'Saved quote history');
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to save quote history');
      // Non-critical error, don't throw
    }
  }

  /**
   * Setup event handlers for queue monitoring
   */
  private setupEventHandlers(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      logger.info({ jobId }, 'Job completed successfully');
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error({ jobId, failedReason }, 'Job failed');
    });

    this.queueEvents.on('retries-exhausted', ({ jobId }) => {
      logger.error({ jobId }, 'Job exhausted all retry attempts');
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      logger.debug({ jobId, progress: data }, 'Job progress update');
    });
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.orderQueue.getWaitingCount(),
      this.orderQueue.getActiveCount(),
      this.orderQueue.getCompletedCount(),
      this.orderQueue.getFailedCount(),
      this.orderQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Close the processor gracefully
   */
  async close(): Promise<void> {
    logger.info('Closing Order Processor...');

    await this.worker.close();
    await this.orderQueue.close();
    await this.queueEvents.close();

    logger.info('Order Processor closed');
  }
}
