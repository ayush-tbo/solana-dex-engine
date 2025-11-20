import { Connection, Keypair } from '@solana/web3.js';
import { env } from './environment';
import { logger } from '../utils/logger';
import bs58 from 'bs58';

// Solana Connection Configuration
export const connection = new Connection(env.RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

// Load wallet from private key
let walletKeypair: Keypair | null = null;

export function getWallet(): Keypair {
  if (walletKeypair) {
    return walletKeypair;
  }

  try {
    // Try to decode as base58
    const privateKeyBytes = bs58.decode(env.SOLANA_PRIVATE_KEY);
    walletKeypair = Keypair.fromSecretKey(privateKeyBytes);
    logger.info({ publicKey: walletKeypair.publicKey.toBase58() }, 'Wallet loaded successfully');
    return walletKeypair;
  } catch (error) {
    logger.error({ error }, 'Failed to load wallet from private key');
    throw new Error('Invalid SOLANA_PRIVATE_KEY format. Must be base58 encoded.');
  }
}

// Test blockchain connection
export async function testBlockchainConnection(): Promise<boolean> {
  try {
    const version = await connection.getVersion();
    logger.info({ version }, 'Connected to Solana RPC');
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Solana RPC');
    return false;
  }
}

// Get SOL balance for wallet
export async function getWalletBalance(publicKey: string): Promise<number> {
  try {
    const balance = await connection.getBalance(
      new (await import('@solana/web3.js')).PublicKey(publicKey)
    );
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    logger.error({ error, publicKey }, 'Failed to get wallet balance');
    throw error;
  }
}

// Blockchain configuration constants
export const BLOCKCHAIN_CONFIG = {
  CLUSTER: 'devnet',
  COMMITMENT: 'confirmed',
  PRIORITY_FEE: env.PRIORITY_FEE_MICRO_LAMPORTS,
  COMPUTE_UNITS: env.COMPUTE_UNIT_LIMIT,
  DEFAULT_SLIPPAGE: env.DEFAULT_SLIPPAGE,
  MAX_SLIPPAGE: env.MAX_SLIPPAGE,
  CONFIRMATION_TIMEOUT: 30000, // 30 seconds
} as const;
