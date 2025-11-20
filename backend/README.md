# Solana DEX Engine - Backend

Backend service for the Solana DEX Order Execution Engine.

## Quick Start

```bash
# Install dependencies
npm install

# Start Docker services
docker-compose up postgres redis bull-board -d

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start development server
npm run dev
```

## API Endpoints

- `POST /api/orders/execute` - Create new order
- `GET /api/orders/:orderId` - Get order details
- `GET /api/orders` - List orders with pagination
- `DELETE /api/orders/:orderId` - Cancel pending order
- `WS /ws/:orderId` - WebSocket connection
- `GET /health` - Health check

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/dex_engine
REDIS_URL=redis://localhost:6379
SOLANA_PRIVATE_KEY=your_base58_private_key

# Optional but recommended
HELIUS_API_KEY=your_helius_api_key
```

## Development Commands

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Start production server
npm test                 # Run tests
npm run typecheck        # Check TypeScript types
npm run prisma:studio    # Open database UI
```

## Tech Stack

- **Framework**: Fastify 4
- **Database**: PostgreSQL 15 + Prisma ORM
- **Queue**: BullMQ + Redis
- **Blockchain**: Solana Web3.js
- **Language**: TypeScript 5

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration modules
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── models/         # Data models
│   ├── utils/          # Utilities
│   ├── types/          # TypeScript types
│   └── server.ts       # Entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed data
└── tests/              # Test files
```

## Ports

- **3000**: HTTP API
- **3001**: WebSocket
- **3030**: Bull Board (Queue monitoring)
- **5432**: PostgreSQL
- **6379**: Redis

## Documentation

See the root directory for complete documentation.
