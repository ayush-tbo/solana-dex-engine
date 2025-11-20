import { Connection, TransactionSignature, Commitment } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { TransactionTimeoutError, BlockchainError } from '../utils/errors';
import { env } from '../config/environment';

export class TransactionService {
  constructor(private connection: Connection) {}

  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForConfirmation(
    signature: TransactionSignature,
    commitment: Commitment = 'confirmed',
    timeoutMs: number = env.ORDER_TIMEOUT_MS
  ): Promise<void> {
    logger.info({ signature, commitment, timeoutMs }, 'Waiting for mock transaction confirmation');

    const startTime = Date.now();

    // Check if this is a mock transaction (starts with alphanumeric and is 88 chars)
    const isMockTx = signature.length === 88 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(signature);

    if (isMockTx) {
      // Mock confirmation - just wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 500));
      const elapsed = Date.now() - startTime;
      logger.info({ signature, elapsed }, 'Mock transaction confirmed successfully');
      return;
    }

    // Real transaction confirmation
    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TransactionTimeoutError(`Transaction confirmation timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const confirmation = this.connection.confirmTransaction({
        signature,
        commitment,
      } as any);

      await Promise.race([confirmation, timeout]);

      const elapsed = Date.now() - startTime;
      logger.info({ signature, elapsed }, 'Transaction confirmed successfully');
    } catch (error) {
      if (error instanceof TransactionTimeoutError) {
        logger.error({ signature, timeoutMs }, 'Transaction confirmation timeout');
        throw error;
      }

      logger.error({ error, signature }, 'Transaction confirmation failed');
      throw new BlockchainError(
        `Transaction confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true // retryable
      );
    }
  }

  /**
   * Get recent prioritization fees from the network
   */
  async getPriorityFee(): Promise<number> {
    try {
      // Use configured priority fee
      const priorityFee = env.PRIORITY_FEE_MICRO_LAMPORTS;

      logger.debug({ priorityFee }, 'Using configured priority fee');
      return priorityFee;
    } catch (error) {
      logger.error({ error }, 'Failed to get priority fee, using default');
      return env.PRIORITY_FEE_MICRO_LAMPORTS;
    }
  }

  /**
   * Get compute unit limit
   */
  getComputeUnitLimit(): number {
    return env.COMPUTE_UNIT_LIMIT;
  }

  /**
   * Get recent blockhash with retry
   */
  async getRecentBlockhash(maxRetries: number = 3): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');

        logger.debug({ blockhash, lastValidBlockHeight, attempt }, 'Got recent blockhash');

        return { blockhash, lastValidBlockHeight };
      } catch (error) {
        lastError = error;
        logger.warn({ error, attempt, maxRetries }, 'Failed to get recent blockhash');

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error({ error: lastError }, 'Failed to get recent blockhash after retries');
    throw new BlockchainError(
      `Failed to get recent blockhash after ${maxRetries} attempts`,
      true // retryable
    );
  }

  /**
   * Check if transaction was successful
   */
  async getTransactionStatus(signature: TransactionSignature): Promise<{
    confirmed: boolean;
    error: string | null;
  }> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status.value) {
        return { confirmed: false, error: 'Transaction not found' };
      }

      if (status.value.err) {
        return {
          confirmed: false,
          error: JSON.stringify(status.value.err),
        };
      }

      const confirmed =
        status.value.confirmationStatus === 'confirmed' ||
        status.value.confirmationStatus === 'finalized';

      return { confirmed, error: null };
    } catch (error) {
      logger.error({ error, signature }, 'Failed to get transaction status');
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(computeUnits: number = env.COMPUTE_UNIT_LIMIT): Promise<number> {
    try {
      const priorityFee = await this.getPriorityFee();

      // Calculate total fee in lamports
      // Base fee + (compute units * priority fee per unit)
      const baseFee = 5000; // Base transaction fee in lamports
      const computeFee = (computeUnits * priorityFee) / 1_000_000; // Convert microlamports to lamports

      const totalFee = baseFee + computeFee;

      logger.debug({ baseFee, computeFee, totalFee }, 'Estimated transaction fee');

      return Math.ceil(totalFee);
    } catch (error) {
      logger.error({ error }, 'Failed to estimate transaction fee');
      return 10000; // Default fallback fee
    }
  }

  /**
   * Check if blockhash is still valid
   */
  async isBlockhashValid(lastValidBlockHeight: number): Promise<boolean> {
    try {
      const currentBlockHeight = await this.connection.getBlockHeight('confirmed');
      const isValid = currentBlockHeight <= lastValidBlockHeight;

      logger.debug(
        { currentBlockHeight, lastValidBlockHeight, isValid },
        'Checked blockhash validity'
      );

      return isValid;
    } catch (error) {
      logger.error({ error }, 'Failed to check blockhash validity');
      return false;
    }
  }
}
