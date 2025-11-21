import { Connection, Keypair } from '@solana/web3.js';
import { Raydium, DEVNET_PROGRAM_ID, LiquidityPoolInfo } from '@raydium-io/raydium-sdk-v2';
import * as bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Query existing Raydium and Meteora pools on devnet
 * This approach uses EXISTING pools rather than creating new ones
 */
async function queryDevnetPools() {
  console.log('🔍 Querying Existing DEX Pools on Devnet...\n');

  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to Solana devnet');

  // Load wallet
  const privateKey = process.env.SOLANA_PRIVATE_KEY!;
  const wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
  console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}\n`);

  try {
    // ========================================
    // RAYDIUM POOLS ON DEVNET
    // ========================================
    console.log('🌐 Querying Raydium Pools...');

    const raydium = await Raydium.load({
      owner: wallet,
      connection,
      cluster: 'devnet',
      disableFeatureCheck: true,
      disableLoadToken: true, // Disable Jupiter token fetching
    });

    console.log('✅ Raydium SDK initialized for devnet\n');

    // Query all pools from RPC with empty config (gets all)
    console.log('⏳ Fetching all Raydium pools from RPC...');
    const allPools = await raydium.liquidity.getPools();

    console.log(`📊 Found ${Object.keys(allPools).length} Raydium pools on devnet`);

    const poolList = Object.values(allPools);
    if (poolList.length > 0) {
      console.log('\nFirst 5 pools:');
      poolList.slice(0, 5).forEach((pool, idx) => {
        console.log(`\n${idx + 1}. Pool ID: ${pool.id}`);
        console.log(`   Token A: ${pool.mintA.mint.toBase58()} (${pool.mintA.decimals} decimals)`);
        console.log(`   Token B: ${pool.mintB.mint.toBase58()} (${pool.mintB.decimals} decimals)`);
        console.log(`   Reserve A: ${pool.mintAmountA.toString()}`);
        console.log(`   Reserve B: ${pool.mintAmountB.toString()}`);
      });
    }

    // Try to query CPMM pools specifically
    console.log('\n⏳ Querying CPMM pools...');
    try {
      const cpmmPools = await raydium.api.getPoolList();
      console.log(`📊 Found ${cpmmPools.length} CPMM pools on devnet`);

      if (cpmmPools.length > 0) {
        console.log('\nFirst 3 CPMM pools:');
        cpmmPools.slice(0, 3).forEach((pool: any, idx: number) => {
          console.log(`\n${idx + 1}. Pool: ${pool.id}`);
          console.log(`   Mint A: ${pool.mintA}`);
          console.log(`   Mint B: ${pool.mintB}`);
          console.log(`   Fee Rate: ${pool.feeRate / 1000000}%`);
        });
      }
    } catch (error: any) {
      console.log('⚠️  CPMM pools query failed (may not be available on devnet):', error.message);
    }

    // ========================================
    // TEST SWAP QUOTE
    // ========================================
    console.log('\n\n🔄 Testing Swap Quote...');

    // Use well-known devnet tokens (SOL and USDC devnet addresses)
    const SOL_DEVNET = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
    const USDC_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // USDC devnet

    console.log(`\nTrying to get quote for SOL → USDC swap:`);
    console.log(`  Input: ${SOL_DEVNET}`);
    console.log(`  Output: ${USDC_DEVNET}`);

    try {
      // Check if pool exists for this pair
      const matchingPools = poolList.filter((pool: LiquidityPoolInfo) => {
        const hasSOL = pool.mintA.mint.toBase58() === SOL_DEVNET || pool.mintB.mint.toBase58() === SOL_DEVNET;
        const hasUSDC = pool.mintA.mint.toBase58() === USDC_DEVNET || pool.mintB.mint.toBase58() === USDC_DEVNET;
        return hasSOL && hasUSDC;
      });

      if (matchingPools.length > 0) {
        console.log(`✅ Found ${matchingPools.length} pool(s) for SOL/USDC`);
        matchingPools.forEach((pool: LiquidityPoolInfo) => {
          console.log(`   Pool ID: ${pool.id}`);
          console.log(`   Reserves: ${pool.mintAmountA.toString()} / ${pool.mintAmountB.toString()}`);
        });
      } else {
        console.log('⚠️  No SOL/USDC pool found on devnet');
        console.log('\n💡 You can use your custom tokens instead:');
        console.log(`   Token A: 3aWPRVQe2KPwUGF6gZTCS7XgZBwoMTNxoDX1mKcAKVqr`);
        console.log(`   Token B: 788bGVjjKAJgGstSYFCBPJcSQPS9VUMKVjZbQPSe7xEb`);
      }
    } catch (error: any) {
      console.log('⚠️  Quote failed:', error.message);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n\n📋 Summary:');
    console.log('─'.repeat(60));

    if (poolList.length > 0) {
      console.log(`✅ Raydium has ${poolList.length} pools on devnet`);
      console.log('✅ You can query and use existing pools');
      console.log('✅ Can execute real swaps if tokens are in those pools');
    } else {
      console.log('⚠️  No Raydium pools found on devnet');
      console.log('💡 Raydium may primarily operate on mainnet');
    }

    console.log('\n🎯 Next Steps:');
    console.log('1. Check if your tokens exist in any devnet pools');
    console.log('2. If not, use MOCK mode for development');
    console.log('3. For real testing, use mainnet with funded wallet');
    console.log('4. Mainnet has thousands of active Raydium/Meteora pools');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

queryDevnetPools()
  .then(() => {
    console.log('\n✅ Query complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Query failed');
    process.exit(1);
  });
