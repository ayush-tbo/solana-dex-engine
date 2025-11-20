import { Connection, Keypair } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { TransactionService } from './transaction-service';
import { PoolNotFoundError, SlippageExceededError } from '../utils/errors';
import { withRetry } from '../utils/errors';
import type { Quote, ExecutionResult } from '../types';
import { env } from '../config/environment';

/**
 * Mock DEX Router for testing and demonstration
 * Simulates Raydium and Meteora with realistic delays and price variations
 */
export class DexRouter {
  private initialized: boolean = false;

  // Mock base prices for common token pairs (SOL/USDC example)
  private readonly BASE_PRICES: { [key: string]: number } = {
    'SOL/USDC': 100.0,
    'USDC/SOL': 0.01,
    'SOL/SOL': 1.0,
  };

  constructor(
    // @ts-ignore - Kept for interface compatibility with real DexRouter
    private _connection: Connection,
    // @ts-ignore - Kept for interface compatibility with real DexRouter
    private _wallet: Keypair,
    // @ts-ignore - Kept for interface compatibility with real DexRouter
    private _transactionService: TransactionService
  ) {}

  /**
   * Initialize the mock DEX router
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('Mock DEX Router already initialized');
      return;
    }

    // Simulate initialization delay
    await this.sleep(500);

    this.initialized = true;
    logger.info('Mock DEX Router initialized successfully');
  }

  /**
   * Get quotes from all DEXs (mock)
   */
  async getQuotes(tokenIn: string, tokenOut: string, amount: bigint): Promise<Quote[]> {
    if (!this.initialized) {
      throw new Error('DEX Router not initialized. Call initialize() first.');
    }

    logger.info({ tokenIn, tokenOut, amount: amount.toString() }, 'Fetching mock quotes from DEXs');

    const quotes: Quote[] = [];

    // Fetch quotes concurrently
    const [raydiumResult, meteoraResult] = await Promise.allSettled([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteorQuote(tokenIn, tokenOut, amount),
    ]);

    if (raydiumResult.status === 'fulfilled') {
      quotes.push(raydiumResult.value);
      logger.info({ quote: raydiumResult.value }, 'Got Raydium mock quote');
    } else {
      logger.warn({ error: raydiumResult.reason }, 'Raydium quote failed');
    }

    if (meteoraResult.status === 'fulfilled') {
      quotes.push(meteoraResult.value);
      logger.info({ quote: meteoraResult.value }, 'Got Meteora mock quote');
    } else {
      logger.warn({ error: meteoraResult.reason }, 'Meteora quote failed');
    }

    if (quotes.length === 0) {
      throw new PoolNotFoundError('No quotes available from any DEX');
    }

    logger.info({ quoteCount: quotes.length }, 'Successfully fetched mock quotes');
    return quotes;
  }

  /**
   * Get mock quote from Raydium
   */
  private async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: bigint
  ): Promise<Quote> {
    // Simulate network delay (150-250ms)
    await this.sleep(150 + Math.random() * 100);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);

    // Raydium: 0.25% fee, price variance ±2%
    const fee = 0.0025;
    const priceVariance = 0.98 + Math.random() * 0.04; // 0.98 to 1.02
    const price = basePrice * priceVariance;

    const inputAmount = amount;
    const amountAfterFee = Number(amount) * (1 - fee);
    const outputAmount = BigInt(Math.floor(amountAfterFee * price));

    return {
      dex: 'RAYDIUM',
      inputAmount,
      outputAmount,
      price,
      fee,
      poolId: this.generateMockPoolId('RAYDIUM'),
      slippage: env.DEFAULT_SLIPPAGE,
    };
  }

  /**
   * Get mock quote from Meteora
   */
  private async getMeteorQuote(
    tokenIn: string,
    tokenOut: string,
    amount: bigint
  ): Promise<Quote> {
    // Simulate network delay (180-280ms)
    await this.sleep(180 + Math.random() * 100);

    const basePrice = this.getBasePrice(tokenIn, tokenOut);

    // Meteora: 0.20% fee, price variance ±3%
    const fee = 0.002;
    const priceVariance = 0.97 + Math.random() * 0.06; // 0.97 to 1.03
    const price = basePrice * priceVariance;

    const inputAmount = amount;
    const amountAfterFee = Number(amount) * (1 - fee);
    const outputAmount = BigInt(Math.floor(amountAfterFee * price));

    return {
      dex: 'METEORA',
      inputAmount,
      outputAmount,
      price,
      fee,
      poolId: this.generateMockPoolId('METEORA'),
      slippage: env.DEFAULT_SLIPPAGE,
    };
  }

  /**
   * Select the best quote based on output amount
   */
  selectBestQuote(quotes: Quote[]): Quote | null {
    if (quotes.length === 0) return null;

    // Select quote with highest output amount (best price)
    const bestQuote = quotes.reduce((best, current) =>
      current.outputAmount > best.outputAmount ? current : best
    );

    logger.info(
      {
        dex: bestQuote.dex,
        price: bestQuote.price,
        outputAmount: bestQuote.outputAmount.toString(),
        fee: bestQuote.fee,
      },
      'Selected best mock quote'
    );

    return bestQuote;
  }

  /**
   * Execute swap with the selected quote (mock)
   */
  async executeSwap(quote: Quote, slippage: number = env.DEFAULT_SLIPPAGE): Promise<ExecutionResult> {
    if (!this.initialized) {
      throw new Error('DEX Router not initialized');
    }

    logger.info({ dex: quote.dex, poolId: quote.poolId }, 'Executing mock swap');

    if (quote.dex === 'RAYDIUM') {
      return await this.executeRaydiumSwap(quote, slippage);
    } else if (quote.dex === 'METEORA') {
      return await this.executeMeteorSwap(quote, slippage);
    } else {
      throw new Error(`Unsupported DEX: ${quote.dex}`);
    }
  }

  /**
   * Execute mock swap on Raydium
   */
  private async executeRaydiumSwap(quote: Quote, slippage: number): Promise<ExecutionResult> {
    return withRetry(
      async () => {
        logger.info({ poolId: quote.poolId, slippage }, 'Building mock Raydium swap transaction');

        // Simulate transaction building delay (500-800ms)
        await this.sleep(500 + Math.random() * 300);

        // Simulate transaction execution delay (2-3 seconds)
        await this.sleep(2000 + Math.random() * 1000);

        // Simulate occasional slippage issues (5% chance)
        if (Math.random() < 0.05) {
          throw new SlippageExceededError('Mock slippage tolerance exceeded');
        }

        // Generate mock transaction hash
        const txId = this.generateMockTxHash();

        // Simulate price execution with minor slippage
        const slippageImpact = Math.random() * slippage * 0.3; // Use 0-30% of max slippage
        const executedPrice = quote.price * (1 - slippageImpact);
        const executedAmount = BigInt(Math.floor(Number(quote.outputAmount) * (1 - slippageImpact)));

        logger.info(
          {
            txId,
            executedPrice,
            executedAmount: executedAmount.toString(),
            slippageImpact,
          },
          'Mock Raydium swap executed successfully'
        );

        return {
          signature: txId,
          executedPrice,
          executedAmount,
          dex: quote.dex,
        };
      },
      {
        maxRetries: env.ORDER_RETRY_ATTEMPTS,
        baseDelay: 2000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
          logger.warn({ attempt, error }, 'Retrying mock swap execution');
        },
      }
    );
  }

  /**
   * Execute mock swap on Meteora
   */
  private async executeMeteorSwap(quote: Quote, slippage: number): Promise<ExecutionResult> {
    return withRetry(
      async () => {
        logger.info({ poolId: quote.poolId, slippage }, 'Building mock Meteora swap transaction');

        // Simulate transaction building delay (400-700ms)
        await this.sleep(400 + Math.random() * 300);

        // Simulate transaction execution delay (1.8-2.8 seconds)
        await this.sleep(1800 + Math.random() * 1000);

        // Simulate occasional slippage issues (3% chance - Meteora is more stable)
        if (Math.random() < 0.03) {
          throw new SlippageExceededError('Mock slippage tolerance exceeded');
        }

        // Generate mock transaction hash
        const txId = this.generateMockTxHash();

        // Simulate price execution with minor slippage
        const slippageImpact = Math.random() * slippage * 0.25; // Use 0-25% of max slippage
        const executedPrice = quote.price * (1 - slippageImpact);
        const executedAmount = BigInt(Math.floor(Number(quote.outputAmount) * (1 - slippageImpact)));

        logger.info(
          {
            txId,
            executedPrice,
            executedAmount: executedAmount.toString(),
            slippageImpact,
          },
          'Mock Meteora swap executed successfully'
        );

        return {
          signature: txId,
          executedPrice,
          executedAmount,
          dex: quote.dex,
        };
      },
      {
        maxRetries: env.ORDER_RETRY_ATTEMPTS,
        baseDelay: 2000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
          logger.warn({ attempt, error }, 'Retrying mock swap execution');
        },
      }
    );
  }

  /**
   * Get available pools for a token pair (mock)
   */
  async getAvailablePools(tokenIn: string, tokenOut: string): Promise<any[]> {
    await this.sleep(200);

    const mockPools = [
      {
        id: this.generateMockPoolId('RAYDIUM'),
        dex: 'RAYDIUM',
        tokenA: tokenIn,
        tokenB: tokenOut,
        liquidity: '1000000',
        fee: 0.0025,
      },
      {
        id: this.generateMockPoolId('METEORA'),
        dex: 'METEORA',
        tokenA: tokenIn,
        tokenB: tokenOut,
        liquidity: '1500000',
        fee: 0.002,
      },
    ];

    logger.info({ poolCount: mockPools.length }, 'Found mock pools');

    return mockPools;
  }

  /**
   * Get base price for token pair
   */
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    // Simplified token symbols for demo
    const inSymbol = this.getTokenSymbol(tokenIn);
    const outSymbol = this.getTokenSymbol(tokenOut);
    const pairKey = `${inSymbol}/${outSymbol}`;

    return this.BASE_PRICES[pairKey] || 1.0;
  }

  /**
   * Get simplified token symbol from address
   */
  private getTokenSymbol(tokenAddress: string): string {
    // SOL wrapped address
    if (tokenAddress === 'So11111111111111111111111111111111111111112') {
      return 'SOL';
    }
    // USDC address
    if (tokenAddress === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
      return 'USDC';
    }
    return 'SOL'; // Default
  }

  /**
   * Generate mock pool ID
   */
  private generateMockPoolId(dex: string): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let id = `${dex}_`;
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  /**
   * Generate mock Solana transaction hash
   */
  private generateMockTxHash(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let hash = '';
    for (let i = 0; i < 88; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
