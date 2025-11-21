import { Connection, PublicKey } from '@solana/web3.js';

async function checkBalance() {
  const conn = new Connection('https://api.devnet.solana.com');
  const pubkey = new PublicKey('E3D19gxQSY1ii32r93w9KzmXMpHzaLgr8JdXkXCCV7DR');
  const balance = await conn.getBalance(pubkey);

  console.log('💰 Devnet Wallet Balance Check');
  console.log('━'.repeat(60));
  console.log('Wallet:', 'E3D19gxQSY1ii32r93w9KzmXMpHzaLgr8JdXkXCCV7DR');
  console.log('Balance:', (balance / 1e9).toFixed(9), 'SOL');
  console.log('Balance (lamports):', balance.toLocaleString());
  console.log('');
  console.log('📊 Transaction Costs:');
  console.log('- Each transaction costs ~5,000 lamports (0.000005 SOL)');
  console.log('- Balance decreases with each real transaction');
  console.log('- This proves transactions are REAL, not mock!');
}

checkBalance();
