import { PrismaClient, OrderStatus, DexType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Clean existing data
  await prisma.quoteHistory.deleteMany();
  await prisma.order.deleteMany();

  // Create sample orders for testing
  const sampleOrders = [
    {
      orderId: 'test-order-1',
      userWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tokenIn: 'So11111111111111111111111111111111111111112', // SOL
      tokenOut: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC (Devnet)
      amountIn: BigInt(1000000000), // 1 SOL
      status: OrderStatus.CONFIRMED,
      selectedDex: DexType.RAYDIUM,
      executedPrice: 100.5,
      txHash: '5Z3vKw9k3bJ6YqQ7rN4pX8hV2sL1mW9jT4nC6fG8dR2aE3bH7sW1qN5pX8hV2sL1',
      slippage: 0.01,
      retryCount: 0,
    },
    {
      orderId: 'test-order-2',
      userWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      tokenIn: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC (Devnet)
      tokenOut: 'So11111111111111111111111111111111111111112', // SOL
      amountIn: BigInt(10000000), // 10 USDC
      status: OrderStatus.PENDING,
      slippage: 0.01,
      retryCount: 0,
    },
  ];

  for (const orderData of sampleOrders) {
    const order = await prisma.order.create({
      data: orderData,
    });
    console.log(`Created order: ${order.orderId}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
