import { Connection, Keypair } from '@solana/web3.js';
import { DexRouter } from '../services/dex-router-devnet-hybrid';
import { TransactionService } from '../services/transaction-service';

describe('DEX Router - Routing Logic', () => {
  let dexRouter: DexRouter;
  let connection: Connection;
  let wallet: Keypair;
  let transactionService: TransactionService;

  beforeAll(async () => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    wallet = Keypair.generate();
    transactionService = new TransactionService(connection);
    dexRouter = new DexRouter(connection, wallet, transactionService);
    await dexRouter.initialize();
  });

  describe('Quote Comparison', () => {
    test('should return quotes from multiple DEXs', async () => {
      const SOL = 'So11111111111111111111111111111111111111112';
      const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      const amount = BigInt(1000000000); // 1 SOL

      const quotes = await dexRouter.getQuotes(SOL, USDC, amount);

      expect(quotes).toBeDefined();
      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dex: expect.any(String),
            inputAmount: expect.any(BigInt),
            outputAmount: expect.any(BigInt),
            price: expect.any(Number),
            fee: expect.any(Number),
          }),
        ])
      );
    });

    test('should select best quote (highest output)', async () => {
      const quotes = [
        {
          dex: 'RAYDIUM' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(100000000), // Higher output
          price: 0.1,
          fee: 0.0025,
          poolId: 'pool-1',
          slippage: 0.01,
        },
        {
          dex: 'METEORA' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(99000000), // Lower output
          price: 0.099,
          fee: 0.002,
          poolId: 'pool-2',
          slippage: 0.01,
        },
      ];

      const bestQuote = dexRouter.selectBestQuote(quotes);

      expect(bestQuote).toBeDefined();
      expect(bestQuote?.dex).toBe('RAYDIUM');
      expect(bestQuote?.outputAmount).toBe(BigInt(100000000));
    });

    test('should return null for empty quotes array', () => {
      const bestQuote = dexRouter.selectBestQuote([]);
      expect(bestQuote).toBeNull();
    });

    test('should calculate correct pricing for different DEXs', async () => {
      const SOL = 'So11111111111111111111111111111111111111112';
      const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      const amount = BigInt(1000000000);

      const quotes = await dexRouter.getQuotes(SOL, USDC, amount);

      // All quotes should have valid prices
      quotes.forEach((quote) => {
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.price).toBeLessThan(1000); // Reasonable price range
        expect(quote.fee).toBeGreaterThan(0);
        expect(quote.fee).toBeLessThan(0.01); // Fees should be < 1%
      });
    });
  });

  describe('Pool Management', () => {
    test('should have initialized pools', () => {
      const pools = dexRouter.getAvailablePools();
      expect(pools.length).toBeGreaterThan(0);
    });

    test('should return pools with valid structure', () => {
      const pools = dexRouter.getAvailablePools();

      pools.forEach((pool) => {
        expect(pool).toHaveProperty('poolId');
        expect(pool).toHaveProperty('dex');
        expect(pool).toHaveProperty('mintA');
        expect(pool).toHaveProperty('mintB');
        expect(['RAYDIUM', 'METEORA']).toContain(pool.dex);
      });
    });

    test('should find matching pools for token pair', async () => {
      const SOL = 'So11111111111111111111111111111111111111112';
      const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
      const amount = BigInt(1000000000);

      const quotes = await dexRouter.getQuotes(SOL, USDC, amount);

      // Should find at least one matching pool
      expect(quotes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Best Quote Selection', () => {
    test('should handle multiple quotes with same output', () => {
      const quotes = [
        {
          dex: 'RAYDIUM' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(100000000),
          price: 0.1,
          fee: 0.0025,
          poolId: 'pool-1',
          slippage: 0.01,
        },
        {
          dex: 'METEORA' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(100000000),
          price: 0.1,
          fee: 0.002,
          poolId: 'pool-2',
          slippage: 0.01,
        },
      ];

      const bestQuote = dexRouter.selectBestQuote(quotes);

      // Should return one of them (first one in this case)
      expect(bestQuote).toBeDefined();
      expect(bestQuote?.outputAmount).toBe(BigInt(100000000));
    });

    test('should prioritize output amount over fee', () => {
      const quotes = [
        {
          dex: 'RAYDIUM' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(100000000),
          price: 0.1,
          fee: 0.0025, // Higher fee
          poolId: 'pool-1',
          slippage: 0.01,
        },
        {
          dex: 'METEORA' as const,
          inputAmount: BigInt(1000000000),
          outputAmount: BigInt(99000000),
          price: 0.099,
          fee: 0.001, // Lower fee
          poolId: 'pool-2',
          slippage: 0.01,
        },
      ];

      const bestQuote = dexRouter.selectBestQuote(quotes);

      // Should select higher output even with higher fee
      expect(bestQuote?.dex).toBe('RAYDIUM');
      expect(bestQuote?.outputAmount).toBe(BigInt(100000000));
    });
  });
});
