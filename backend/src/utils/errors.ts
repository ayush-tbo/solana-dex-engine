export enum SolanaErrorType {
  RETRYABLE = 'retryable',
  NON_RETRYABLE = 'non_retryable',
  LOGIC_ERROR = 'logic_error',
}

export class DexEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'DexEngineError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends DexEngineError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.name = 'ValidationError';
  }
}

export class BlockchainError extends DexEngineError {
  constructor(message: string, retryable: boolean = false) {
    super(message, 'BLOCKCHAIN_ERROR', 500, retryable);
    this.name = 'BlockchainError';
  }
}

export class InsufficientFundsError extends DexEngineError {
  constructor(message: string = 'Insufficient funds for transaction') {
    super(message, 'INSUFFICIENT_FUNDS', 400, false);
    this.name = 'InsufficientFundsError';
  }
}

export class SlippageExceededError extends DexEngineError {
  constructor(message: string = 'Slippage tolerance exceeded') {
    super(message, 'SLIPPAGE_EXCEEDED', 400, false);
    this.name = 'SlippageExceededError';
  }
}

export class PoolNotFoundError extends DexEngineError {
  constructor(message: string = 'Pool not found for token pair') {
    super(message, 'POOL_NOT_FOUND', 404, false);
    this.name = 'PoolNotFoundError';
  }
}

export class TransactionTimeoutError extends DexEngineError {
  constructor(message: string = 'Transaction confirmation timeout') {
    super(message, 'TRANSACTION_TIMEOUT', 408, true);
    this.name = 'TransactionTimeoutError';
  }
}

export class OrderNotFoundError extends DexEngineError {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`, 'ORDER_NOT_FOUND', 404, false);
    this.name = 'OrderNotFoundError';
  }
}

/**
 * Classifies Solana errors to determine if they should be retried
 */
export function classifySolanaError(error: any): SolanaErrorType {
  const message = error.message?.toLowerCase() || '';

  // Retryable errors - network/timing issues
  if (
    message.includes('blockhash not found') ||
    message.includes('transaction expired') ||
    message.includes('network error') ||
    message.includes('timeout') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('node is unhealthy') ||
    message.includes('connection') ||
    message.includes('econnreset')
  ) {
    return SolanaErrorType.RETRYABLE;
  }

  // Non-retryable errors - user/config issues
  if (
    message.includes('insufficient funds') ||
    message.includes('invalid signature') ||
    message.includes('account not found') ||
    message.includes('invalid account data') ||
    message.includes('invalid public key') ||
    message.includes('invalid keypair')
  ) {
    return SolanaErrorType.NON_RETRYABLE;
  }

  // Logic errors - business logic issues
  if (
    message.includes('slippage') ||
    message.includes('pool not found') ||
    message.includes('invalid mint') ||
    message.includes('insufficient liquidity') ||
    message.includes('price impact too high')
  ) {
    return SolanaErrorType.LOGIC_ERROR;
  }

  // Default to retryable for unknown errors
  return SolanaErrorType.RETRYABLE;
}

/**
 * Retry operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: any) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error should be retried
      const errorType = classifySolanaError(error);

      if (errorType === SolanaErrorType.NON_RETRYABLE) {
        throw error; // Don't retry non-retryable errors
      }

      if (attempt === maxRetries - 1) {
        throw error; // Final attempt failed
      }

      // Calculate exponential backoff delay
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
