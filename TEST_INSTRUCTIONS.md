# Test Suite Instructions

## Overview

This project includes comprehensive test coverage for:
- **DEX Routing Logic** (11 tests) - Quote retrieval, best quote selection, price calculation
- **Order Queue Behavior** (9 tests) - FIFO ordering, concurrency control, rate limiting
- **WebSocket Lifecycle** (25 tests) - Connection management, message broadcasting, cleanup

**Total: 45 unit/integration tests**

## Prerequisites

Before running tests, ensure you have:
- Node.js >= 20.0.0
- Redis running locally on port 6379
- PostgreSQL database (optional for most tests)

## Running Tests

### Run all tests
```bash
cd backend
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
# DEX Router tests
npm test -- dex-router.test.ts

# Order Queue tests
npm test -- order-queue.test.ts

# WebSocket tests
npm test -- websocket.test.ts
```

## Test Files

### 1. DEX Router Tests (`src/tests/dex-router.test.ts`)

Tests the core DEX routing and quote selection logic:

- ✅ Quote retrieval from multiple DEXs (Raydium, Meteora)
- ✅ Best quote selection (highest output amount)
- ✅ Null handling for empty quotes
- ✅ Price calculation validation
- ✅ Pool initialization
- ✅ Pool structure validation
- ✅ Token pair matching
- ✅ Multiple quotes with same output
- ✅ Output prioritization over fee
- ✅ Pool liquidity validation
- ✅ Invalid token pair handling

**Running:**
```bash
npm test -- dex-router.test.ts
```

### 2. Order Queue Tests (`src/tests/order-queue.test.ts`)

Tests BullMQ queue behavior and job processing:

- ✅ Order submission to queue
- ✅ Multiple concurrent orders (10 orders)
- ✅ FIFO ordering for equal priority jobs
- ✅ Waiting jobs count tracking
- ✅ Completed jobs tracking
- ✅ Job retry mechanism (3 attempts)
- ✅ Concurrency control (max 3 concurrent)
- ✅ Rate limiting (2 jobs per second)
- ✅ Queue metrics

**Requirements:**
- Redis must be running on localhost:6379

**Running:**
```bash
npm test -- order-queue.test.ts
```

### 3. WebSocket Tests (`src/tests/websocket.test.ts`)

Tests WebSocket connection lifecycle and message broadcasting:

**Connection Management (5 tests):**
- ✅ Add connection successfully
- ✅ Handle multiple connections for same order
- ✅ Remove connection on disconnect
- ✅ Handle removing non-existent connection
- ✅ Return empty array for order with no connections

**Message Broadcasting (5 tests):**
- ✅ Broadcast to single connection
- ✅ Broadcast to all connections for same order
- ✅ Skip closed connections
- ✅ Handle send errors gracefully
- ✅ Don't broadcast to other orders

**Connection Cleanup (3 tests):**
- ✅ Close all connections for an order
- ✅ Close all connections globally
- ✅ Remove stale connections automatically

**Status Update Delivery (3 tests):**
- ✅ Deliver complete order lifecycle updates
- ✅ Deliver transaction hash on confirmation
- ✅ Deliver error updates

**Connection State Management (3 tests):**
- ✅ Track active connections count
- ✅ Update stats after connection removal
- ✅ Handle concurrent connection operations

**Running:**
```bash
npm test -- websocket.test.ts
```

## Test Coverage Goals

The test suite aims for:
- **Branches:** 80%
- **Functions:** 80%
- **Lines:** 80%
- **Statements:** 80%

Check current coverage:
```bash
npm run test:coverage
```

## Continuous Integration

Tests are configured to run in CI/CD pipelines. The test suite:
- Uses mocked logger to reduce noise
- Has 30-second timeout for blockchain operations
- Cleans up database connections after all tests
- Runs in isolated test environment

## Troubleshooting

### Redis connection errors
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution:** Start Redis:
```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### Port already in use
```
Error: listen EADDRINUSE: address already in use :::6379
```
**Solution:** Kill existing Redis process:
```bash
lsof -ti:6379 | xargs kill -9
```

### Tests timing out
**Solution:** Increase Jest timeout in `jest.config.js`:
```javascript
testTimeout: 60000 // 60 seconds
```

## Example Test Output

```
PASS  src/tests/dex-router.test.ts
  DEX Router - Routing Logic
    ✓ should return quotes from multiple DEXs (1234ms)
    ✓ should select best quote (highest output) (156ms)
    ✓ should return null for empty quotes (23ms)
    ...

PASS  src/tests/order-queue.test.ts
  Order Queue - Queue Behavior
    ✓ should add order to queue (234ms)
    ✓ should handle multiple concurrent orders (567ms)
    ✓ should maintain FIFO order (189ms)
    ...

PASS  src/tests/websocket.test.ts
  WebSocket - Lifecycle and Messaging
    Connection Management
      ✓ should add connection successfully (12ms)
      ✓ should handle multiple connections for same order (8ms)
      ...

Test Suites: 3 passed, 3 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        12.456 s
```

## Integration with Postman

For API testing, use the included Postman collection:
- Import `Solana_DEX_API.postman_collection.json`
- Set `BASE_URL` variable to your deployment URL
- Run collection tests to verify API endpoints

## Next Steps

After running tests successfully:
1. ✅ Verify all 45 tests pass
2. ✅ Check test coverage meets 80% threshold
3. ✅ Test against production deployment
4. ✅ Run Postman collection for API validation
5. ✅ Record demo video showing test results
