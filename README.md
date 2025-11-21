# Solana DEX Order Execution Engine

Production-ready Solana DEX order execution engine with real blockchain transactions on devnet. Features include DEX routing, real-time WebSocket updates, and concurrent order processing with BullMQ.

## 🚀 Quick Start (5 minutes)

```bash
# 1. Clone and setup backend
cd backend
npm install
cp .env.example .env

# 2. Start services
docker-compose up -d

# 3. Setup database
npm run prisma:generate
npm run prisma:migrate

# 4. Start backend
npm run dev

# 5. Start frontend (in new terminal)
cd ../frontend-react
npm install
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- API: http://localhost:3000
- Bull Board: http://localhost:3030
- WebSocket: ws://localhost:3001

## ✨ Features

- ✅ **Real Blockchain Transactions** - Creates actual transactions on Solana devnet ([proof](PROOF_OF_REAL_TRANSACTIONS.md))
- ✅ **Two Router Modes** - Switch between Mock and Hybrid via `.env` ([token config](DEVNET_TOKEN_CONFIG.md))
- ✅ **DEX Routing** - Intelligent routing between Raydium and Meteora pools
- ✅ **Real-time Updates** - WebSocket broadcasting of order status
- ✅ **React Frontend** - Modern UI with live order tracking and blockchain explorer links
- ✅ **Concurrent Processing** - Handles 10 concurrent orders with BullMQ + Redis
- ✅ **Type Safety** - Full TypeScript with Prisma ORM
- ✅ **Error Handling** - Exponential backoff retry with Solana-specific error handling
- ✅ **Free to Use** - Uses Solana devnet with airdropped SOL

## 🎯 What Makes This Real?

Unlike mock implementations, this engine creates **actual blockchain transactions**:

| Mock Implementation | This Engine ✅ |
|-------------------|---------------|
| Simulated signatures | Real blockchain signatures |
| No network fees | Pays real fees (5000 lamports) |
| Instant confirmation | Real confirmation (~1-2 seconds) |
| Not on Solscan | Visible on [Solscan](https://solscan.io/tx/NGZB8qX2CAbQZYtjCEX599tWzbFazgZRyDdCMHw2E7YwNgY4qhpxbEyw1uqff353PVkUNvL72PR5akiNjnYwtnh?cluster=devnet) |
| Cannot verify | Verifiable via RPC |

**Proof**: Run `cd backend && npx tsx src/scripts/verify-transaction.ts <TX_HASH>` to verify any transaction exists on blockchain.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 5173)                │
│          Order submission, real-time updates, history        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                  Fastify Backend (Port 3000)                 │
│  ┌──────────────┐              ┌──────────────┐             │
│  │ Order Routes │◄────────────►│ WebSocket    │             │
│  │ REST API     │              │ Manager      │             │
│  └──────┬───────┘              └──────▲───────┘             │
│         │                             │                     │
│         ▼                             │                     │
│  ┌──────────────┐              ┌─────┴────────┐            │
│  │ Order        │◄────────────►│ BullMQ Queue │            │
│  │ Processor    │              │ (Redis)      │            │
│  └──────┬───────┘              └──────────────┘            │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │ Hybrid DEX   │  • Simulated pool pricing               │
│  │ Router       │  • REAL blockchain transactions         │
│  └──────┬───────┘                                          │
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
          ▼
   Solana Devnet
   (Real blockchain)
```

## 📁 Project Structure

```
Solana_dex/
├── backend/                          # Node.js + TypeScript backend
│   ├── src/
│   │   ├── config/                   # Environment configuration
│   │   ├── routes/                   # API endpoints
│   │   ├── services/
│   │   │   ├── dex-router-mock.ts            # Mock router (USE_REAL_DEX=false)
│   │   │   ├── dex-router-devnet-hybrid.ts   # Hybrid router (USE_REAL_DEX=true) ✅
│   │   │   ├── order-processor.ts            # BullMQ job processor
│   │   │   ├── transaction-service.ts        # Blockchain interaction
│   │   │   ├── websocket-manager.ts          # Real-time updates
│   │   │   └── index.ts                      # Service exports
│   │   ├── scripts/
│   │   │   ├── verify-transaction.ts # Blockchain verification tool
│   │   │   └── check-balance.ts      # Wallet balance checker
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── utils/                    # Helper utilities
│   │   └── server.ts                 # Fastify server entry point
│   ├── prisma/                       # Database schema & migrations
│   ├── docker-compose.yml            # PostgreSQL + Redis + Bull Board
│   ├── Solana_DEX_Engine.postman_collection.json  # API testing
│   ├── README.md                     # Backend documentation
│   └── package.json
│
├── frontend-react/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── OrderForm.tsx         # Submit orders with devnet tokens
│   │   │   ├── ActiveOrders.tsx      # Live order tracking via WebSocket
│   │   │   ├── OrderHistory.tsx      # Past orders with Solscan links
│   │   │   ├── OrderCard.tsx         # Order display component
│   │   │   └── StatsPanel.tsx        # Statistics dashboard
│   │   ├── App.tsx                   # Main app component
│   │   ├── main.tsx                  # React entry point
│   │   └── types.ts                  # TypeScript types
│   └── package.json
│
├── README.md                         # Main project documentation
├── PROOF_OF_REAL_TRANSACTIONS.md    # Blockchain verification proof
├── DEVNET_TOKEN_CONFIG.md            # Token addresses & configuration
└── .gitignore                        # Git ignore rules
```

## 🔧 Tech Stack

**Backend:**
- Node.js 20+ with TypeScript 5+
- Fastify 4+ (REST API + WebSocket)
- BullMQ 4+ with Redis 7+ (job queue)
- PostgreSQL 15+ with Prisma ORM
- @solana/web3.js 1.95+ (blockchain interaction)

**Frontend:**
- React 18+ with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Lucide Icons

**Infrastructure:**
- Docker & Docker Compose
- Solana Devnet (free blockchain testnet)

## 📡 API Documentation

### Create Order
```http
POST /api/orders
Content-Type: application/json

{
  "tokenIn": "So11111111111111111111111111111111111111112",
  "tokenOut": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "amount": "50000000",
  "slippage": 0.01
}
```

**Response:**
```json
{
  "orderId": "60790396-701c-4d7d-8829-824e51f72eb7",
  "status": "PENDING",
  "wsUrl": "ws://localhost:3000:3001/ws/60790396-701c-4d7d-8829-824e51f72eb7",
  "createdAt": "2025-11-21T06:31:23.209Z"
}
```

### Get Order Status
```http
GET /api/orders/{orderId}
```

### List Orders
```http
GET /api/orders?limit=20&offset=0&status=CONFIRMED
```

### WebSocket Updates
```javascript
const ws = new WebSocket('ws://localhost:3001/ws/{orderId}');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Order update:', update);
};
```

## 🔄 Order Lifecycle

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
                                     ↓
                                  FAILED
```

1. **PENDING** - Order created and queued
2. **ROUTING** - Fetching quotes from DEX pools
3. **BUILDING** - Building transaction with best quote
4. **SUBMITTED** - Transaction sent to Solana blockchain
5. **CONFIRMED** - Transaction confirmed on-chain ✅
6. **FAILED** - Order failed (with retry logic)

## 🪙 Token Configuration (Devnet)

**Supported Trading Pairs:**

| Token | Address | Network |
|-------|---------|---------|
| SOL | `So11111111111111111111111111111111111111112` | Devnet |
| USDC | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Devnet ✅ |

⚠️ **Important**: Do NOT use mainnet USDC (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`) - it will fail.

## 🛠️ Configuration

### Backend (.env)

#### DEX Router Modes

The system supports two modes controlled by the `USE_REAL_DEX` environment variable:

| Mode | `USE_REAL_DEX` | Blockchain | Pools | Cost |
|------|---------------|------------|-------|------|
| **Mock** | `false` | ❌ Simulated | ❌ Simulated | FREE |
| **Hybrid** ✅ | `true` | ✅ Real (Devnet) | ❌ Simulated | FREE |

**Current Mode: Hybrid** - Creates real blockchain transactions on Solana devnet with simulated pool pricing.

#### Configuration File

```bash
# Blockchain - DEVNET
RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_devnet_wallet_private_key

# DEX Router Mode
# false = Mock mode (fully simulated, no real transactions)
# true = Hybrid mode (REAL blockchain transactions on devnet + simulated pools)
USE_REAL_DEX=true

# Database
DATABASE_URL=postgresql://dex_user:dex_password@localhost:5432/dex_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Switching Between Modes

**To use Mock mode** (no real transactions):
```bash
# In backend/.env
USE_REAL_DEX=false
```
Then restart the backend: `npm run dev`

**To use Hybrid mode** (real devnet transactions):
```bash
# In backend/.env
USE_REAL_DEX=true
```
Then restart the backend: `npm run dev`

### Get Free Devnet SOL
```bash
# Request airdrop (2 SOL)
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url https://api.devnet.solana.com

# Or use web faucet: https://faucet.solana.com/
```

## 🧪 Verification & Testing

### Verify Transaction on Blockchain
```bash
cd backend
npx tsx src/scripts/verify-transaction.ts <TX_HASH>
```

This queries the Solana blockchain RPC and returns:
- Block time and slot number
- Transaction fee paid
- Account keys and instructions
- Solscan link

### Check Wallet Balance
```bash
cd backend
npx tsx src/scripts/check-balance.ts
```

Shows your devnet SOL balance and proves fees are being deducted.

### Run Backend Tests
```bash
cd backend
npm test
```

## 📊 Monitoring

**Bull Board** (Queue Dashboard): http://localhost:3030
- View active, completed, and failed jobs
- Retry failed orders
- Monitor queue health

## 🐛 Troubleshooting

### "No valid quotes available"
**Cause**: Using wrong token addresses (mainnet USDC instead of devnet)
**Fix**: Use devnet USDC: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

### "Transaction not found" on Solscan
**Cause**: Missing `?cluster=devnet` parameter
**Fix**: Links should be `https://solscan.io/tx/{TX}?cluster=devnet`

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Docker services not starting
```bash
cd backend
docker-compose down
docker-compose up -d
```

## 📚 Additional Documentation

### Core Documentation
- **[PROOF_OF_REAL_TRANSACTIONS.md](PROOF_OF_REAL_TRANSACTIONS.md)** - Proof that transactions are real on blockchain
- **[DEVNET_TOKEN_CONFIG.md](DEVNET_TOKEN_CONFIG.md)** - Token addresses and configuration guide

### Backend Documentation
- **[backend/README.md](backend/README.md)** - Backend detailed documentation
- **Postman Collection** - `backend/Solana_DEX_Engine.postman_collection.json` for API testing

### Verification Scripts
- **`backend/src/scripts/verify-transaction.ts`** - Verify any transaction on blockchain
- **`backend/src/scripts/check-balance.ts`** - Check devnet wallet balance

## 🎯 Key Achievements

✅ Real blockchain transactions on Solana devnet
✅ Verified on-chain with transaction signatures
✅ React frontend with real-time WebSocket updates
✅ Concurrent order processing (10 orders simultaneously)
✅ Intelligent DEX routing (Raydium vs Meteora)
✅ Production-ready error handling and retry logic
✅ Complete TypeScript type safety
✅ Docker-based infrastructure

## 📈 Performance

- **Throughput**: 10 concurrent orders, 100/minute
- **Transaction Time**: ~1-2 seconds on devnet
- **Queue Processing**: BullMQ with Redis backing
- **Error Recovery**: Exponential backoff with 3 retry attempts
- **Cost**: FREE on devnet (uses airdropped SOL)

## 🔐 Security Notes

- Private keys are loaded from environment variables
- NEVER commit `.env` files to git
- This is a DEVNET implementation - do not use with mainnet funds
- For production mainnet deployment, additional security measures required

## 🤝 Contributing

This is a portfolio demonstration project. Feel free to fork and build upon it!

## 📄 License

MIT License - See LICENSE file for details

## 💬 Support

For questions or issues:
1. Check the [documentation](PROOF_OF_REAL_TRANSACTIONS.md)
2. Run the verification scripts
3. Open an issue on GitHub

---

**Built with ❤️ using Solana, React, and TypeScript**

*Real blockchain transactions. Real-time updates. Real DEX routing.*
