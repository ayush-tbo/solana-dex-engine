# Demo Video Guide (1-2 minutes)

## What to Show

Your DEX engine demonstrates **real-time order processing with live blockchain transactions** on Solana devnet. The system shows:

1. **Multiple concurrent orders** being processed
2. **Status progression**: PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
3. **DEX routing decisions** (Raydium vs Meteora)
4. **Real blockchain transactions** on Solana devnet
5. **WebSocket real-time updates**

## Setup Before Recording

### 1. Deploy to Production (if not done)

```bash
# Backend to Railway
cd backend
railway login
railway up

# Frontend to Vercel
cd ../frontend-react
vercel --prod
```

### 2. Get Railway Logs Terminal Ready

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Start watching logs (keep this terminal open)
railway logs --follow
```

### 3. Update Frontend API URL

Update `frontend-react/src/App.tsx` line 9:
```typescript
const API_BASE_URL = 'https://your-backend.up.railway.app';
```

And `frontend-react/src/components/ActiveOrders.tsx` lines 7-9 (remove the conditional):
```typescript
const WS_BASE_URL = 'wss://your-backend.up.railway.app';
```

## Recording Setup

### Screen Layout

Split your screen to show:
- **Left half**: Your deployed frontend (Vercel URL)
- **Right half**: Railway logs terminal (showing real-time backend logs)

OR use OBS/screen recorder to show:
1. Frontend (main focus)
2. Browser DevTools console (to show WebSocket messages)
3. Railway logs terminal (picture-in-picture)

## Demo Script (1-2 minutes)

### Opening (5 seconds)
*Show the frontend homepage*
- "This is a Solana DEX aggregator engine that routes orders through Raydium and Meteora for best execution"

### Part 1: Submit Multiple Orders (10 seconds)
*Quickly submit 3-5 orders in succession*
- Click "Submit Order" 3-5 times rapidly
- "I'm submitting 5 orders simultaneously to demonstrate the queue system"

### Part 2: Show Real-Time Updates (30 seconds)
*Point to the Active Orders section*
- "Watch the status progression for each order:"
  - **PENDING**: Initial state (yellow)
  - **ROUTING**: Getting quotes from DEXs (blue)
  - **BUILDING**: Building transaction (purple)
  - **SUBMITTED**: Sent to blockchain (orange)
  - **CONFIRMED**: Transaction confirmed (green)

*Point to Railway logs terminal*
- "In the backend logs, you can see:"
  - "Getting best quote" - shows routing decisions
  - "Selected best quote" - shows which DEX was chosen
  - "Transaction confirmed on devnet" - shows real Solana transactions

### Part 3: Show DEX Routing (15 seconds)
*Point to completed orders in Active Orders or Order History*
- "Each order shows which DEX was selected for best price"
- "Notice different orders may use different DEXs (Raydium or Meteora)"
- "The system compares quotes and selects the best execution price"

### Part 4: Show Real Transactions (15 seconds)
*Click on a transaction hash link*
- "These are real blockchain transactions on Solana devnet"
- *Browser opens Solscan showing the transaction*
- "You can verify every swap on Solana explorer"

### Part 5: Show Order History (10 seconds)
*Scroll to Order History section*
- "Completed orders move to history, showing:"
  - Final execution price
  - Selected DEX
  - Transaction hash
  - Order completion status

### Closing (5 seconds)
*Show Railway logs one more time*
- "The entire system processes orders concurrently with real-time WebSocket updates and actual blockchain integration"

## Key Points to Highlight

### Technical Features
1. ✅ **Queue Processing**: Multiple orders processed concurrently (show 3-5 active)
2. ✅ **DEX Routing**: Raydium vs Meteora comparison (show in logs)
3. ✅ **Real-time Updates**: WebSocket showing status transitions
4. ✅ **Blockchain Integration**: Real Solana devnet transactions
5. ✅ **Status Flow**: PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED

### What Logs Show

**Railway Backend Logs:**
```
{"orderId":"abc123"} Getting best quote
{"orderId":"abc123","selectedDex":"RAYDIUM","price":100.25} Selected best quote
{"orderId":"abc123","txHash":"5K7..."} Transaction confirmed on devnet
```

**Browser Console (DevTools):**
```
Order abc123 update: {type: "update", status: "ROUTING", ...}
Order abc123 update: {type: "update", status: "BUILDING", ...}
Order abc123 update: {type: "update", status: "CONFIRMED", txHash: "5K7..."}
```

## What the System Demonstrates

### Architecture
- **Frontend**: React + TypeScript + Tailwind (deployed on Vercel)
- **Backend**: Node.js + Fastify + BullMQ queue (deployed on Railway)
- **Database**: PostgreSQL + Redis (Railway)
- **Blockchain**: Solana Web3.js (devnet)
- **Real-time**: WebSocket connections for live updates

### Order Flow
1. User submits order → Added to BullMQ queue
2. Worker picks up order → Status: ROUTING
3. Get quotes from Raydium & Meteora → Select best
4. Build transaction → Status: BUILDING
5. Submit to Solana → Status: SUBMITTED
6. Wait for confirmation → Status: CONFIRMED
7. Broadcast updates via WebSocket → Frontend updates in real-time

### Design Decisions
1. **Queue System**: BullMQ handles concurrency, retries, and rate limiting
2. **DEX Abstraction**: Router interface allows easy addition of new DEXs
3. **WebSocket**: Real-time updates without polling
4. **Hybrid Mode**: Uses real blockchain with simulated pools (no actual liquidity needed)
5. **Devnet**: Free testing environment with real on-chain transactions

## Tips for Better Recording

1. **Use Dark Theme**: Already set in the UI
2. **Clear Console**: Clear browser console before starting
3. **Zoom In**: Make sure text is readable (125% browser zoom)
4. **No Errors**: Verify Railway and frontend are running smoothly
5. **Quick Pace**: Keep it moving, 1-2 minutes is tight
6. **Vertical Video**: If for mobile/YouTube Shorts, use portrait mode

## Common Issues

### WebSocket Not Connecting
- Check that `WS_BASE_URL` in `ActiveOrders.tsx` uses `wss://` (not `ws://`)
- Verify Railway deployment is running

### Orders Stuck in PENDING
- Check Railway logs for errors
- Verify Solana devnet connection
- Ensure Redis is running on Railway

### No Logs Showing
- Run `railway logs --follow` to stream live logs
- Check Railway dashboard for deployment status

## After Recording

Show the final system:
- ✅ Multiple orders processed concurrently
- ✅ Real-time status updates via WebSocket
- ✅ DEX routing decisions visible in logs
- ✅ Real Solana blockchain transactions
- ✅ Complete order history with execution details

## Example Narration

> "This is a Solana DEX aggregator that routes swaps through Raydium and Meteora. I'm going to submit 5 orders simultaneously. Watch how each order flows through the system: from pending, to routing where it compares DEX quotes, to building the transaction, submitting it to Solana devnet, and finally getting confirmed on-chain. In the backend logs, you can see the routing decisions and which DEX was selected for each order based on best price. Every transaction is real and verifiable on Solana explorer. The system handles multiple concurrent orders using a queue, broadcasts real-time updates via WebSocket, and stores complete execution history."

That's 45 seconds. Add 30-45 seconds of showing the UI elements, clicking transaction links, and demonstrating the features.
