import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const signature = process.argv[2] || '3xNsNxbxQ5SeKBddsjSEey2LvDXoUvqn1gmgKpgXfRC5EhCwEeEJLkKTqMmPMHaKdQ1U3xqqBs9JMa4zGG6vQ4BH';

async function verifyTransaction() {
  console.log('🔍 Verifying transaction on Solana devnet blockchain...\n');

  try {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0
    });

    if (tx === null) {
      console.log('❌ Transaction NOT FOUND on blockchain');
      console.log('This would be a MOCK transaction');
      process.exit(1);
    }

    console.log('✅ REAL BLOCKCHAIN TRANSACTION CONFIRMED!\n');
    console.log('Transaction Details:');
    console.log('━'.repeat(60));
    console.log('Signature:', signature);
    console.log('Block Time:', new Date((tx.blockTime || 0) * 1000).toISOString());
    console.log('Slot:', tx.slot);
    console.log('Fee (lamports):', tx.meta?.fee || 'N/A');
    console.log('Status:', tx.meta?.err ? '❌ Failed' : '✅ Success');
    console.log('Compute Units:', tx.meta?.computeUnitsConsumed || 'N/A');
    console.log('\nAccount Keys:', tx.transaction.message.staticAccountKeys?.length || 0);
    console.log('Instructions:', tx.transaction.message.compiledInstructions?.length || 0);
    console.log('\n🌐 View on Solscan:');
    console.log(`https://solscan.io/tx/${signature}?cluster=devnet`);
    console.log('\n✨ This proves the transaction exists on the Solana devnet blockchain!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyTransaction();
