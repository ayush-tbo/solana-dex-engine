import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  WhirlpoolContext,
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil,
  PoolUtil,
  increaseLiquidityQuoteByInputTokenWithParams,
  PriceMath,
} from '@orca-so/whirlpools-sdk';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { DecimalUtil, Percentage } from '@orca-so/common-sdk';
import Decimal from 'decimal.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import BN from 'bn.js';

dotenv.config();

async function createOrcaWhirlpool() {
  console.log('🌊 Creating Orca Whirlpool on Devnet...\n');

  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to Solana devnet');

  // Load wallet
  const privateKey = process.env.SOLANA_PRIVATE_KEY!;
  const bs58Module = (bs58.default || bs58) as any;
  const keypair = Keypair.fromSecretKey(bs58Module.decode(privateKey));
  const wallet = new Wallet(keypair);
  console.log(`✅ Wallet: ${keypair.publicKey.toBase58()}`);

  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.5e9) {
    throw new Error('Insufficient balance. Need at least 0.5 SOL');
  }

  // Token addresses
  const tokenAMint = new PublicKey('3aWPRVQe2KPwUGF6gZTCS7XgZBwoMTNxoDX1mKcAKVqr');
  const tokenBMint = new PublicKey('788bGVjjKAJgGstSYFCBPJcSQPS9VUMKVjZbQPSe7xEb');

  console.log(`Token A: ${tokenAMint.toBase58()} (9 decimals)`);
  console.log(`Token B: ${tokenBMint.toBase58()} (6 decimals)\n`);

  try {
    // Initialize Orca client
    console.log('⏳ Initializing Orca Whirlpool client...');
    const provider = AnchorProvider.local('https://api.devnet.solana.com');
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const client = buildWhirlpoolClient(ctx);
    console.log('✅ Orca client initialized\n');

    // Get whirlpools config (devnet default)
    const DEVNET_WHIRLPOOLS_CONFIG = new PublicKey('FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR');
    const tickSpacing = 64; // Standard tick spacing (0.3% fee tier)

    console.log('📊 Pool Parameters:');
    console.log(`  - Config: ${DEVNET_WHIRLPOOLS_CONFIG.toBase58()}`);
    console.log(`  - Tick Spacing: ${tickSpacing}`);
    console.log(`  - Fee Tier: 0.3%\n`);

    // Order tokens correctly (Orca requires tokens ordered by pubkey)
    const [mintA, mintB] = PoolUtil.orderMints(tokenAMint, tokenBMint);
    console.log(`Ordered mints:`);
    console.log(`  - Mint A: ${mintA.toBase58()}`);
    console.log(`  - Mint B: ${mintB.toBase58()}\n`);

    // Derive pool PDA
    const whirlpoolPda = PDAUtil.getWhirlpool(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      DEVNET_WHIRLPOOLS_CONFIG,
      mintA,
      mintB,
      tickSpacing
    );

    console.log(`Pool PDA: ${whirlpoolPda.publicKey.toBase58()}\n`);

    // Check if pool already exists
    console.log('⏳ Checking if pool exists...');
    const poolAccount = await connection.getAccountInfo(whirlpoolPda.publicKey);

    if (poolAccount) {
      console.log('✅ Pool already exists!');
      console.log(`  - Pool Address: ${whirlpoolPda.publicKey.toBase58()}`);
      console.log(`  - View on Solscan: https://solscan.io/account/${whirlpoolPda.publicKey.toBase58()}?cluster=devnet\n`);

      // Fetch pool data
      const pool = await client.getPool(whirlpoolPda.publicKey);
      const poolData = pool.getData();

      console.log('📈 Pool Data:');
      console.log(`  - Current Price: ${poolData.sqrtPrice.toString()}`);
      console.log(`  - Liquidity: ${poolData.liquidity.toString()}`);
      console.log(`  - Tick Current Index: ${poolData.tickCurrentIndex}`);
      console.log(`  - Fee Rate: ${poolData.feeRate / 10000}%\n`);

      return {
        poolAddress: whirlpoolPda.publicKey.toBase58(),
        exists: true,
      };
    }

    console.log('Pool does not exist. Creating new pool...\n');

    // Calculate initial price (1:1 ratio accounting for decimals)
    // Token A: 9 decimals, Token B: 6 decimals
    // For 1:1 value ratio, we need price = 10^(decimalsA - decimalsB) = 1000
    const initialPrice = new Decimal(1000);
    const decimalsA = mintA.equals(tokenAMint) ? 9 : 6;
    const decimalsB = mintA.equals(tokenAMint) ? 6 : 9;

    console.log(`💡 Initial Price Calculation:`);
    console.log(`  - Decimals A: ${decimalsA}`);
    console.log(`  - Decimals B: ${decimalsB}`);
    console.log(`  - Price (A/B): ${initialPrice.toString()}\n`);

    // Create pool instruction
    console.log('⏳ Creating pool transaction...');

    const createPoolTx = await client.createPool(
      DEVNET_WHIRLPOOLS_CONFIG,
      mintA,
      mintB,
      tickSpacing,
      initialPrice,
      ctx.wallet.publicKey
    );

    console.log('⏳ Sending transaction...');
    const txId = await createPoolTx.buildAndExecute();

    console.log('\n✅ Pool created successfully!');
    console.log(`  - Transaction: https://solscan.io/tx/${txId}?cluster=devnet`);
    console.log(`  - Pool Address: ${whirlpoolPda.publicKey.toBase58()}`);
    console.log(`  - View Pool: https://solscan.io/account/${whirlpoolPda.publicKey.toBase58()}?cluster=devnet\n`);

    console.log('📝 Save this pool address for your backend:');
    const poolInfo = {
      poolAddress: whirlpoolPda.publicKey.toBase58(),
      tokenA: mintA.toBase58(),
      tokenB: mintB.toBase58(),
      tickSpacing,
      initialPrice: initialPrice.toString(),
      txHash: txId,
      createdAt: new Date().toISOString(),
    };
    console.log(JSON.stringify(poolInfo, null, 2));

    return poolInfo;

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    console.error('Full error:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}

createOrcaWhirlpool()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
