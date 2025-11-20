import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';
import { ValidationError } from './errors';

// Solana address validator
const solanaAddressSchema = z.string().refine(
  (address) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid Solana address' }
);

// Order execution request schema
export const executeOrderSchema = z.object({
  tokenIn: solanaAddressSchema,
  tokenOut: solanaAddressSchema,
  amount: z.string().refine(
    (val) => {
      try {
        const num = BigInt(val);
        return num > 0n;
      } catch {
        return false;
      }
    },
    { message: 'Amount must be a positive integer string' }
  ),
  slippage: z.number().min(0).max(0.5).optional(),
  userWallet: solanaAddressSchema.optional(),
}).refine(
  (data) => data.tokenIn !== data.tokenOut,
  { message: 'Token in and token out must be different', path: ['tokenOut'] }
);

export type ExecuteOrderInput = z.infer<typeof executeOrderSchema>;

// WebSocket connection schema
export const wsConnectionSchema = z.object({
  orderId: z.string().uuid(),
});

// Query parameters schema
export const orderQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
  userWallet: solanaAddressSchema.optional(),
  status: z.enum(['PENDING', 'ROUTING', 'BUILDING', 'SUBMITTED', 'CONFIRMED', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export type OrderQueryParams = z.infer<typeof orderQuerySchema>;

/**
 * Validates input and throws ValidationError if invalid
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new ValidationError(messages.join(', '));
    }
    throw error;
  }
}

/**
 * Safe validates and returns result
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * Validates Solana address
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates amount is positive bigint
 */
export function isValidAmount(amount: string): boolean {
  try {
    const num = BigInt(amount);
    return num > 0n;
  } catch {
    return false;
  }
}
