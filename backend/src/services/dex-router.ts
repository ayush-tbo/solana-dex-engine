import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { logger } from '../utils/logger';
import { TransactionService } from './transaction-service';
import { PoolNotFoundError, BlockchainError, SlippageExceededError } from '../utils/errors';
import { withRetry } from '../utils/errors';
import type { Quote, ExecutionResult } from '../types';
import { env } from '../config/environment';

export class DexRouter {
  private raydium: Raydium | null = null;
  private initialized: boolean = false;

  constructor(
    private connection: Connection,
    private wallet: Keypair,
    private transactionService: TransactionService
  ) {}

  /**
   * Initialize the DEX SDKs
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('DEX Router already initialized');
      return;
    }

    try {
      logger.info('Initializing DEX Router...');

      // Initialize Raydium SDK
      this.raydium = await Raydium.load({
        owner: this.wallet,
        connection: this.connection,
        cluster: 'devnet',
        disableFeatureCheck: true,
        disableLoadToken: false,
      });

      this.initialized = true;
      logger.info('DEX Router initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize DEX Router');
      throw new BlockchainError('Failed to initialize DEX Router', false);
    }
  }

  /**
   * Get quotes from all DEXs
   */
  async getQuotes(tokenIn: string, tokenOut: string, amount: bigint): Promise<Quote[]> {
    if (!this.initialized) {
      throw new Error('DEX Router not initialized. Call initialize() first.');
    }

    logger.info({ tokenIn, tokenOut, amount: amount.toString() }, 'Fetching quotes from DEXs');

    const quotes: Quote[] = [];

    // Fetch quotes concurrently
    const [raydiumResult] = await Promise.allSettled([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      // Meteora integration can be added here
      // this.getMeteorQuote(tokenIn, tokenOut, amount),
    ]);

    if (raydiumResult.status === 'fulfilled') {
      quotes.push(raydiumResult.value);
      logger.info({ quote: raydiumResult.value }, 'Got Raydium quote');
    } else {
      logger.warn({ error: raydiumResult.reason }, 'Raydium quote failed');
    }

    if (quotes.length === 0) {
      throw new PoolNotFoundError('No quotes available from any DEX');
    }

    logger.info({ quoteCount: quotes.length }, 'Successfully fetched quotes');
    return quotes;
  }

  /**
   * Get quote from Raydium
   */
  private async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: bigint
  ): Promise<Quote> {
    if (!this.raydium) {
      throw new Error('Raydium SDK not initialized');
    }

    try {
      const inputMint = new PublicKey(tokenIn);
      const outputMint = new PublicKey(tokenOut);

      // Get pool information
      const poolsResult = await this.raydium.api.fetchPoolByMints({
        mint1: inputMint,
        mint2: outputMint,
      });

      const pools = poolsResult.data;

      if (!pools || pools.length === 0) {
        throw new PoolNotFoundError(`No Raydium pool found for ${tokenIn}/${tokenOut}`);
      }

      // Use the first available pool (can be enhanced with liquidity comparison)
      const pool = pools[0];

      logger.debug({ poolId: pool.id, poolType: pool.type }, 'Found Raydium pool');

      // Calculate quote using pool reserves
      // This is a simplified calculation - actual implementation would use Raydium's compute methods
      const inputAmount = amount;
      const outputAmount = this.calculateOutputAmount(inputAmount, pool);

      const price = Number(outputAmount) / Number(inputAmount);

      return {
        dex: 'RAYDIUM',
        inputAmount,
        outputAmount,
        price,
        fee: 0.0025, // 0.25% fee for Raydium
        poolId: pool.id,
        slippage: env.DEFAULT_SLIPPAGE,
      };
    } catch (error) {
      logger.error({ error, tokenIn, tokenOut }, 'Failed to get Raydium quote');
      if (error instanceof PoolNotFoundError) {
        throw error;
      }
      throw new BlockchainError(
        `Failed to get Raydium quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  /**
   * Calculate output amount (simplified)
   * In production, use Raydium's actual calculation methods
   */
  private calculateOutputAmount(inputAmount: bigint, _pool: any): bigint {
    // Simplified constant product formula
    // In production, use the actual pool's calculation logic
    const fee = 0.0025; // 0.25%
    const amountAfterFee = Number(inputAmount) * (1 - fee);

    // This is a placeholder - actual calculation depends on pool type
    const outputAmount = BigInt(Math.floor(amountAfterFee * 0.95)); // Simplified ratio

    return outputAmount;
  }

  /**
   * Select the best quote
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
      },
      'Selected best quote'
    );

    return bestQuote;
  }

  /**
   * Execute swap with the selected quote
   */
  async executeSwap(quote: Quote, slippage: number = env.DEFAULT_SLIPPAGE): Promise<ExecutionResult> {
    if (!this.initialized) {
      throw new Error('DEX Router not initialized');
    }

    logger.info({ dex: quote.dex, poolId: quote.poolId }, 'Executing swap');

    try {
      if (quote.dex === 'RAYDIUM') {
        return await this.executeRaydiumSwap(quote, slippage);
      } else {
        throw new Error(`Unsupported DEX: ${quote.dex}`);
      }
    } catch (error) {
      logger.error({ error, quote }, 'Swap execution failed');
      throw error;
    }
  }

  /**
   * Execute swap on Raydium
   */
  private async executeRaydiumSwap(quote: Quote, slippage: number): Promise<ExecutionResult> {
    if (!this.raydium) {
      throw new Error('Raydium SDK not initialized');
    }

    return withRetry(
      async () => {
        try {
          logger.info({ poolId: quote.poolId, slippage }, 'Building Raydium swap transaction');

          // Get fresh pool information
          const { poolInfo } = await this.raydium!.cpmm.getPoolInfoFromRpc(quote.poolId);

          // Simplified swap execution
          // Note: This is a placeholder - actual Raydium SDK v2 swap implementation
          // may require different parameters based on the SDK version
          logger.warn('Using simplified swap - update for production');

          // For now, we'll throw an informative error until proper SDK integration
          throw new BlockchainError(
            'Raydium SDK v2 swap integration pending - requires proper SDK setup',
            false
          );

          // Placeholder for actual swap execution
          // const { txId } = await swapResult.execute({ sendAndConfirm: true });
          const txId = 'placeholder-tx-id';

          logger.info({ txId, poolInfo }, 'Swap transaction submitted');

          // Wait for confirmation
          await this.transactionService.waitForConfirmation(txId, 'confirmed');

          logger.info({ txId }, 'Swap transaction confirmed');

          return {
            signature: txId,
            executedPrice: quote.price,
            executedAmount: quote.outputAmount,
            dex: quote.dex,
          };
        } catch (error) {
          // Check if it's a slippage error
          if (error instanceof Error && error.message.toLowerCase().includes('slippage')) {
            throw new SlippageExceededError(`Slippage tolerance exceeded: ${error.message}`);
          }

          logger.error({ error }, 'Raydium swap execution failed');
          throw new BlockchainError(
            `Raydium swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            true
          );
        }
      },
      {
        maxRetries: env.ORDER_RETRY_ATTEMPTS,
        baseDelay: 2000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
          logger.warn({ attempt, error }, 'Retrying swap execution');
        },
      }
    );
  }

  /**
   * Get available pools for a token pair
   */
  async getAvailablePools(tokenIn: string, tokenOut: string): Promise<any[]> {
    if (!this.raydium) {
      throw new Error('Raydium SDK not initialized');
    }

    try {
      const inputMint = new PublicKey(tokenIn);
      const outputMint = new PublicKey(tokenOut);

      const poolsResult = await this.raydium.api.fetchPoolByMints({
        mint1: inputMint,
        mint2: outputMint,
      });

      const pools = poolsResult.data || [];

      logger.info({ poolCount: pools.length }, 'Found pools');

      return pools;
    } catch (error) {
      logger.error({ error, tokenIn, tokenOut }, 'Failed to fetch pools');
      return [];
    }
  }
}
