import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  PDAUtil,
  PoolUtil,
  PriceMath,
  ORCA_WHIRLPOOL_PROGRAM_ID,
} from '@orca-so/whirlpools-sdk';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import Decimal from 'decimal.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

async function createOrcaPool() {
  console.log('🚀 Starting Orca Whirlpool Creation on Devnet...\n');

  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to Solana devnet');

  // Load wallet from private key
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not found in environment');
  }

  const walletKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const wallet = new Wallet(walletKeypair);
  console.log(`✅ Wallet loaded: ${walletKeypair.publicKey.toBase58()}`);

  // Check wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log(`💰 Wallet balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.2e9) {
    throw new Error('Insufficient balance. Need at least 0.2 SOL for pool creation');
  }

  // Token addresses
  const tokenAAddress = '3aWPRVQe2KPwUGF6gZTCS7XgZBwoMTNxoDX1mKcAKVqr';
  const tokenBAddress = '788bGVjjKAJgGstSYFCBPJcSQPS9VUMKVjZbQPSe7xEb';

  const mintA = new PublicKey(tokenAAddress);
  const mintB = new PublicKey(tokenBAddress);

  console.log(`Token A (9 decimals): ${tokenAAddress}`);
  console.log(`Token B (6 decimals): ${tokenBAddress}\n`);

  // Initialize Orca Whirlpool client
  console.log('⏳ Initializing Orca Whirlpool client...');
  const provider = new AnchorProvider(connection, wallet, {});
  const ctx = WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID);
  const client = buildWhirlpoolClient(ctx);
  console.log('✅ Orca client initialized\n');

  try {
    console.log('⏳ Creating Whirlpool...');

    // For Orca Whirlpools, we need to:
    // 1. Get or create a WhirlpoolsConfig (usually use the default devnet config)
    // 2. Create the pool with the desired tick spacing (64 is common)
    // 3. Initialize positions and add liquidity

    const feeTierKey = new PublicKey('FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR'); // Devnet default whirlpools config
    const tickSpacing = 64; // Common tick spacing (fee tier 0.3%)

    // Determine token order (Orca requires tokens to be ordered by pubkey)
    const [tokenMintA, tokenMintB] = PoolUtil.orderMints(mintA, mintB).map(m => m.toString());

    console.log('📊 Pool Parameters:');
    console.log(`  - Token Mint A: ${tokenMintA}`);
    console.log(`  - Token Mint B: ${tokenMintB}`);
    console.log(`  - Tick Spacing: ${tickSpacing} (0.3% fee)`);
    console.log(`  - Initial Price: 1.0 (equal value)\n`);

    // Calculate initial price (1:1 ratio accounting for decimals)
    // Token A: 9 decimals, Token B: 6 decimals
    // 1 Token A = 1 Token B means price = 1.0 * 10^(9-6) = 1000
    const initialPrice = new Decimal(1000); // 1 Token A = 1 Token B
    const initialSqrtPrice = PriceMath.priceToSqrtPriceX64(initialPrice, 9, 6);

    console.log(`💡 This approach requires more complex setup with Orca.`);
    console.log(`   Alternatively, we should use a simpler option or create a Raydium AMM V4 pool.`);
    console.log(`\nNote: Pool creation on devnet may not be fully supported for all DEXs.`);
    console.log(`Consider these alternatives:`);
    console.log(`1. Use mainnet with funded wallet`);
    console.log(`2. Create a simple local AMM for testing`);
    console.log(`3. Use mock implementation for development\n`);

  } catch (error) {
    console.error('\n❌ Error creating pool:', error);
    throw error;
  }
}

// Run the script
createOrcaPool()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
