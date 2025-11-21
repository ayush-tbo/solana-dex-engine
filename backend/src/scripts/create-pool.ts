import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Raydium, TxVersion, API_URLS } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

async function createRaydiumCPMMPool() {
  console.log('🚀 Starting Raydium CPMM Pool Creation on Devnet...\n');

  // Initialize connection
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  console.log('✅ Connected to Solana devnet');

  // Load wallet from private key
  const privateKey = process.env.SOLANA_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY not found in environment');
  }

  const walletKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
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

  // Initialize Raydium SDK
  console.log('⏳ Initializing Raydium SDK for devnet...');
  const raydium = await Raydium.load({
    owner: walletKeypair,
    connection: connection,
    cluster: 'devnet',
    disableFeatureCheck: true,
  });
  console.log('✅ Raydium SDK initialized\n');

  // Fetch available CPMM configs
  console.log('⏳ Fetching CPMM pool configurations...');
  const cpmmConfigs = await raydium.api.getCpmmConfigs();

  if (!cpmmConfigs || cpmmConfigs.length === 0) {
    throw new Error('No CPMM configs available on devnet');
  }

  // Use the first config (default)
  const feeConfig = cpmmConfigs[0];
  console.log(`✅ Using fee config: ${feeConfig.id}`);
  console.log(`  - Trade Fee: ${(feeConfig.tradeFeeRate / 1000000000) * 100}%`);
  console.log(`  - Protocol Fee: ${(feeConfig.protocolFeeRate / 1000000000) * 100}%`);
  console.log(`  - Fund Fee: ${(feeConfig.fundFeeRate / 1000000000) * 100}%\n`);

  // Prepare pool creation parameters
  const mintAAmount = new BN(1_000_000).mul(new BN(10).pow(new BN(9))); // 1M tokens with 9 decimals
  const mintBAmount = new BN(1_000_000).mul(new BN(10).pow(new BN(6))); // 1M tokens with 6 decimals

  console.log('📊 Pool Parameters:');
  console.log(`  - Token A Amount: 1,000,000 (${mintAAmount.toString()} lamports)`);
  console.log(`  - Token B Amount: 1,000,000 (${mintBAmount.toString()} lamports)`);
  console.log(`  - Start Time: Immediate (0)\n`);

  try {
    console.log('⏳ Creating CPMM pool...');

    const { execute, extInfo } = await raydium.cpmm.createPool({
      programId: new PublicKey(feeConfig.id),
      poolFeeAccount: new PublicKey('DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8'),
      mintA: {
        address: mintA.toBase58(),
        decimals: 9,
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      },
      mintB: {
        address: mintB.toBase58(),
        decimals: 6,
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      },
      mintAAmount,
      mintBAmount,
      startTime: new BN(0), // Start immediately
      feeConfig,
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: true,
      },
      txVersion: TxVersion.LEGACY,
    });

    console.log('📋 Pool info prepared:');
    console.log(`  - Pool ID: ${extInfo.address.poolId.toBase58()}`);
    console.log(`  - LP Mint: ${extInfo.address.lpMint.toBase58()}\n`);

    console.log('⏳ Executing transaction...');
    const { txId } = await execute({ sendAndConfirm: true });

    console.log('\n✅ Pool created successfully!');
    console.log(`  - Transaction: https://solscan.io/tx/${txId}?cluster=devnet`);
    console.log(`  - Pool ID: ${extInfo.address.poolId.toBase58()}`);
    console.log(`  - LP Mint: ${extInfo.address.lpMint.toBase58()}`);

    // Save pool info to a file for reference
    const poolInfo = {
      poolId: extInfo.address.poolId.toBase58(),
      lpMint: extInfo.address.lpMint.toBase58(),
      tokenA: tokenAAddress,
      tokenB: tokenBAddress,
      txHash: txId,
      createdAt: new Date().toISOString(),
    };

    console.log('\n📝 Pool Info (save this for your backend):');
    console.log(JSON.stringify(poolInfo, null, 2));

  } catch (error) {
    console.error('\n❌ Error creating pool:', error);
    throw error;
  }
}

// Run the script
createRaydiumCPMMPool()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
