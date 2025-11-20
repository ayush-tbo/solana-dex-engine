import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { env } from '../config/environment';
import { validateInput, executeOrderSchema, orderQuerySchema } from '../utils/validation';
import { logger } from '../utils/logger';
import { OrderNotFoundError } from '../utils/errors';
import type { OrderResponse, OrderHistoryItem, PaginatedResponse } from '../types';
import { OrderStatus } from '@prisma/client';

export async function registerOrderRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/orders (alias for /execute)
   * Submit a new market order
   */
  const orderHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const input = validateInput(executeOrderSchema, request.body);

    const orderId = uuidv4();
    const userWallet = input.userWallet || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'; // Default wallet for testing

    logger.info({ orderId, input }, 'New order execution request');

    // Create order in database
    const order = await prisma.order.create({
      data: {
        orderId,
        userWallet,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amountIn: BigInt(input.amount),
        status: OrderStatus.PENDING,
        slippage: input.slippage || env.DEFAULT_SLIPPAGE,
      },
    });

    // Submit to order processing queue
    if (fastify.services?.orderProcessor) {
      await fastify.services.orderProcessor.submitOrder({
        orderId,
        tokenIn: input.tokenIn,
        tokenOut: input.tokenOut,
        amount: input.amount,
        slippage: input.slippage || env.DEFAULT_SLIPPAGE,
        userWallet,
        timestamp: Date.now(),
      });
      logger.info({ orderId }, 'Order submitted to processing queue');
    } else {
      logger.warn({ orderId }, 'Order processor not available');
    }

    const response: OrderResponse = {
      orderId: order.orderId,
      status: order.status,
      wsUrl: `ws://${request.hostname}:${env.WS_PORT}/ws/${orderId}`,
      createdAt: order.createdAt,
    };

    reply.code(201).send(response);
  };

  // Register both POST /api/orders and POST /api/orders/execute
  fastify.post('/', orderHandler);
  fastify.post('/execute', orderHandler);

  /**
   * GET /api/orders/:orderId
   * Get order details by ID
   */
  fastify.get('/:orderId', async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
    const { orderId } = request.params;

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        quotes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    const response: OrderHistoryItem = {
      id: order.id,
      orderId: order.orderId,
      userWallet: order.userWallet,
      tokenIn: order.tokenIn,
      tokenOut: order.tokenOut,
      amountIn: order.amountIn.toString(),
      amountOut: order.amountOut?.toString() || null,
      status: order.status,
      selectedDex: order.selectedDex,
      executedPrice: order.executedPrice?.toString() || null,
      txHash: order.txHash,
      slippage: order.slippage.toString(),
      errorMessage: order.errorMessage,
      retryCount: order.retryCount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    reply.send(response);
  });

  /**
   * GET /api/orders
   * List orders with pagination and filtering
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = validateInput(orderQuerySchema, request.query);

    const limit = query.limit || 20;
    const offset = query.offset || 0;

    const where: any = {};
    if (query.orderId) where.orderId = query.orderId;
    if (query.userWallet) where.userWallet = query.userWallet;
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    const response: PaginatedResponse<OrderHistoryItem> = {
      data: orders.map((order) => ({
        id: order.id,
        orderId: order.orderId,
        userWallet: order.userWallet,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn.toString(),
        amountOut: order.amountOut?.toString() || null,
        status: order.status,
        selectedDex: order.selectedDex,
        executedPrice: order.executedPrice?.toString() || null,
        txHash: order.txHash,
        slippage: order.slippage.toString(),
        errorMessage: order.errorMessage,
        retryCount: order.retryCount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    reply.send(response);
  });

  /**
   * DELETE /api/orders/:orderId
   * Cancel a pending order
   */
  fastify.delete('/:orderId', async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
    const { orderId } = request.params;

    const order = await prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new OrderNotFoundError(orderId);
    }

    // Only allow cancellation of pending orders
    if (order.status !== OrderStatus.PENDING) {
      reply.code(400).send({
        error: {
          message: 'Can only cancel pending orders',
          code: 'INVALID_STATUS',
        },
      });
      return;
    }

    // Update order status to failed
    await prisma.order.update({
      where: { orderId },
      data: {
        status: OrderStatus.FAILED,
        errorMessage: 'Cancelled by user',
      },
    });

    // TODO: Remove from queue if not yet processed

    reply.code(200).send({ message: 'Order cancelled successfully' });
  });
}
