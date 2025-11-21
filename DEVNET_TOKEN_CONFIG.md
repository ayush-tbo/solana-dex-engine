# Devnet Token Configuration

## ✅ Correct Token Addresses for Devnet

### SOL (Native Token)
- Address: `So11111111111111111111111111111111111111112`
- Same on mainnet and devnet

### USDC (Devnet)
- Address: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- **NOT** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (mainnet USDC)

### Custom Test Tokens
- Token A: `3aWPRVQe2KPwUGF6gZTCS7XgZBwoMTNxoDX1mKcAKVqr`
- Token B: `788bGVjjKAJgGstSYFCBPJcSQPS9VUMKVjZbQPSe7xEb`

## 🔧 Fixed Files

1. **Frontend**: [frontend-react/src/components/OrderForm.tsx](frontend-react/src/components/OrderForm.tsx)
   - Updated `USDC_ADDRESS` from mainnet to devnet

2. **Backend Mock Router**: [backend/src/services/dex-router-mock.ts](backend/src/services/dex-router-mock.ts)
   - Added support for both mainnet and devnet USDC addresses

3. **Database Seed**: [backend/prisma/seed.ts](backend/prisma/seed.ts)
   - Updated sample orders to use devnet USDC

## 🧪 Testing

### Valid Order Submission (Frontend or API)

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "50000000",
    "slippage": 0.01
  }'
```

### View Transaction on Solscan

All transactions are on devnet. Append `?cluster=devnet` to Solscan URLs:

```
https://solscan.io/tx/{TX_HASH}?cluster=devnet
```

## ✅ Recent Successful Transactions

### Transaction 1
- **TX Hash**: `23iB1uD8KP3KkDEDKYMoyDZpTDFLjaAFJx7ttzeyZve6nnTFS24MvJqK7EVDpvdaSUpuyePGN3JopevVUTFvykUK`
- **Amount**: 0.01 SOL → USDC
- **Status**: CONFIRMED
- **Link**: https://solscan.io/tx/23iB1uD8KP3KkDEDKYMoyDZpTDFLjaAFJx7ttzeyZve6nnTFS24MvJqK7EVDpvdaSUpuyePGN3JopevVUTFvykUK?cluster=devnet

### Transaction 2
- **TX Hash**: `3xNsNxbxQ5SeKBddsjSEey2LvDXoUvqn1gmgKpgXfRC5EhCwEeEJLkKTqMmPMHaKdQ1U3xqqBs9JMa4zGG6vQ4BH`
- **Amount**: 0.05 SOL → USDC
- **Status**: CONFIRMED
- **Link**: https://solscan.io/tx/3xNsNxbxQ5SeKBddsjSEey2LvDXoUvqn1gmgKpgXfRC5EhCwEeEJLkKTqMmPMHaKdQ1U3xqqBs9JMa4zGG6vQ4BH?cluster=devnet

## ⚠️ Common Errors

### "No valid quotes available"
**Cause**: Using wrong token addresses (e.g., mainnet USDC instead of devnet)
**Fix**: Use correct devnet token addresses listed above

### "Meteora swap execution not available on devnet"
**Cause**: Old error from before hybrid router was implemented
**Status**: Fixed - hybrid router now works on devnet

## 🚀 Quick Start

1. **Start backend** (already running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend**:
   ```bash
   cd frontend-react
   npm run dev
   ```

3. **Submit orders** using the web UI with correct devnet tokens

All orders will create **real blockchain transactions** on Solana devnet using your airdropped devnet SOL!
