import { Connection, Keypair } from '@solana/web3.js';
import { TransactionService } from '../services/transaction-service';
import { DexRouter } from '../services/dex-router-devnet-hybrid';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test the hybrid DEX router on devnet
 * - Real blockchain transactions
 * - Free devnet SOL
 * - Simulated pool pricing
 */
async function testDevnetSwap() {
  console.log('🧪 Testing Hybrid DEX Router on Devnet\n');
  console.log('This will create REAL transactions on Solana devnet!\n');

  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to devnet');

  // Load wallet
  const privateKey = process.env.SOLANA_PRIVATE_KEY!;
  const bs58Module = (bs58.default || bs58) as any;
  const wallet = Keypair.fromSecretKey(bs58Module.decode(privateKey));
  console.log(`✅ Wallet: ${wallet.publicKey.toBase58()}`);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${balance / 1e9} SOL\n`);

  if (balance < 0.01e9) {
    console.log('⚠️  Low balance! Get free SOL from: https://faucet.solana.com/');
    return;
  }

  try {
    // Initialize services
    const transactionService = new TransactionService(connection);
    const dexRouter = new DexRouter(connection, wallet, transactionService);

    console.log('⏳ Initializing hybrid DEX router...');
    await dexRouter.initialize();
    console.log('✅ Router initialized\n');

    // Show available pools
    console.log('📊 Available Pools:');
    const pools = dexRouter.getAvailablePools();
    pools.forEach((pool, idx) => {
      console.log(`${idx + 1}. ${pool.dex} - ${pool.mintA.substring(0, 8)}... / ${pool.mintB.substring(0, 8)}...`);
    });
    console.log('');

    // Test swap: SOL to USDC
    const SOL = 'So11111111111111111111111111111111111111112';
    const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
    const amount = BigInt(0.1 * 1e9); // 0.1 SOL

    console.log('🔄 Testing Swap:');
    console.log(`   Input: 0.1 SOL`);
    console.log(`   Output: USDC\n`);

    // Get quote
    console.log('⏳ Getting best quote...');
    const quote = await dexRouter.getBestQuote(SOL, USDC, amount);

    console.log('✅ Quote received:');
    console.log(`   DEX: ${quote.dex}`);
    console.log(`   Input: ${Number(quote.inputAmount) / 1e9} SOL`);
    console.log(`   Output: ${Number(quote.outputAmount) / 1e6} USDC`);
    console.log(`   Price: ${quote.price.toFixed(2)} USDC per SOL`);
    console.log(`   Fee: ${(quote.fee * 100).toFixed(2)}%`);
    console.log(`   Pool: ${quote.poolId}\n`);

    // Execute swap
    console.log('⏳ Executing swap on devnet blockchain...');
    const result = await dexRouter.executeSwap(quote);

    if (result.success) {
      console.log('\n✅ SWAP SUCCESSFUL!');
      console.log(`   Transaction: ${result.signature}`);
      console.log(`   Explorer: https://solscan.io/tx/${result.signature}?cluster=devnet`);
      console.log(`   Input: ${Number(result.inputAmount) / 1e9} SOL`);
      console.log(`   Output: ${Number(result.outputAmount) / 1e6} USDC`);
      console.log(`   Fee: ${Number(result.fee) / 1e9} SOL`);
      console.log(`   DEX: ${result.dex}\n`);

      console.log('🎉 You can view this transaction on Solscan devnet!');
      console.log('This is a REAL on-chain transaction using free devnet SOL.\n');
    } else {
      console.log('❌ Swap failed');
    }

    // Check new balance
    const newBalance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 New balance: ${newBalance / 1e9} SOL`);
    console.log(`📉 Transaction cost: ${(balance - newBalance) / 1e9} SOL\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testDevnetSwap()
  .then(() => {
    console.log('✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
