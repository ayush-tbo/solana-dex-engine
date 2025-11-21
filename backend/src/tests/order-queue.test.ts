import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

describe('Order Queue - Queue Behavior', () => {
  let redis: Redis;
  let testQueue: Queue;

  beforeAll(() => {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    });
  });

  beforeEach(async () => {
    testQueue = new Queue('test-order-queue', {
      connection: redis,
    });
    await testQueue.obliterate({ force: true });
  });

  afterEach(async () => {
    await testQueue.close();
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('Order Submission', () => {
    test('should add order to queue', async () => {
      const orderData = {
        orderId: 'test-order-1',
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: '1000000000',
        slippage: 0.01,
        userWallet: 'test-wallet',
        timestamp: Date.now(),
      };

      const job = await testQueue.add('process-order', orderData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data).toEqual(orderData);
    });

    test('should handle multiple concurrent orders', async () => {
      const orders = Array.from({ length: 10 }, (_, i) => ({
        orderId: `test-order-${i}`,
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amount: '1000000000',
        slippage: 0.01,
        userWallet: 'test-wallet',
        timestamp: Date.now(),
      }));

      const jobs = await Promise.all(
        orders.map((order) => testQueue.add('process-order', order))
      );

      expect(jobs).toHaveLength(10);

      const waiting = await testQueue.getWaitingCount();
      expect(waiting).toBe(10);
    });

    test('should add jobs with different priorities', async () => {
      // Add jobs with explicit priorities (lower number = higher priority)
      const order1 = await testQueue.add('process-order', { orderId: 'high-priority' }, { priority: 1 });
      const order2 = await testQueue.add('process-order', { orderId: 'medium-priority' }, { priority: 5 });
      const order3 = await testQueue.add('process-order', { orderId: 'low-priority' }, { priority: 10 });

      // Verify all jobs were added
      expect(order1.id).toBeDefined();
      expect(order2.id).toBeDefined();
      expect(order3.id).toBeDefined();

      // Check priority values
      expect(order1.opts.priority).toBe(1);
      expect(order2.opts.priority).toBe(5);
      expect(order3.opts.priority).toBe(10);
    });
  });

  describe('Queue Metrics', () => {
    test('should track waiting jobs count', async () => {
      await testQueue.add('process-order', { orderId: 'order-1' });
      await testQueue.add('process-order', { orderId: 'order-2' });

      const waiting = await testQueue.getWaitingCount();
      expect(waiting).toBe(2);
    });

    test('should track completed jobs', async () => {
      const worker = new Worker(
        'test-order-queue',
        async (_job) => {
          return { success: true };
        },
        { connection: redis }
      );

      await testQueue.add('process-order', { orderId: 'order-1' });

      // Wait for job to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const completed = await testQueue.getCompletedCount();
      expect(completed).toBeGreaterThan(0);

      await worker.close();
    });

    test('should handle job retries on failure', async () => {
      let attempts = 0;

      const worker = new Worker(
        'test-order-queue',
        async (_job) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated failure');
          }
          return { success: true };
        },
        {
          connection: redis,
        }
      );

      await testQueue.add(
        'process-order',
        { orderId: 'retry-test' },
        { attempts: 3, backoff: { type: 'fixed', delay: 100 } }
      );

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(attempts).toBe(3);

      await worker.close();
    });
  });

  describe('Concurrency Control', () => {
    test('should process jobs with specified concurrency', async () => {
      let activeJobs = 0;
      let maxActiveJobs = 0;

      const worker = new Worker(
        'test-order-queue',
        async (_job) => {
          activeJobs++;
          maxActiveJobs = Math.max(maxActiveJobs, activeJobs);

          await new Promise((resolve) => setTimeout(resolve, 100));

          activeJobs--;
          return { success: true };
        },
        {
          connection: redis,
          concurrency: 3,
        }
      );

      // Add 10 jobs
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          testQueue.add('process-order', { orderId: `job-${i}` })
        )
      );

      // Wait for all jobs to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(maxActiveJobs).toBeLessThanOrEqual(3);
      expect(maxActiveJobs).toBeGreaterThan(0);

      await worker.close();
    });
  });

  describe('Rate Limiting', () => {
    test('should respect rate limit configuration', async () => {
      const processedTimes: number[] = [];

      const worker = new Worker(
        'test-order-queue',
        async (_job) => {
          processedTimes.push(Date.now());
          return { success: true };
        },
        {
          connection: redis,
          limiter: {
            max: 2, // Max 2 jobs
            duration: 1000, // Per second
          },
        }
      );

      // Add 5 jobs quickly
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          testQueue.add('process-order', { orderId: `rate-test-${i}` })
        )
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check that not all jobs were processed immediately
      expect(processedTimes.length).toBe(5);

      // First 2 should be close together, then gap for rate limit
      const gap1 = processedTimes[2] - processedTimes[1];
      expect(gap1).toBeGreaterThan(500); // Should have delay due to rate limit

      await worker.close();
    });
  });
});
