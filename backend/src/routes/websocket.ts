import type { FastifyInstance, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import type { WebSocketMessage } from '../types';
import { prisma } from '../config/database';

export async function registerWebSocketRoutes(fastify: FastifyInstance) {
  /**
   * WebSocket connection endpoint: /ws/:orderId
   * Clients connect to receive real-time order status updates
   */
  fastify.get(
    '/:orderId',
    { websocket: true },
    async (connection: any, request: FastifyRequest<{ Params: { orderId: string } }>) => {
      const { orderId } = request.params;

      logger.info({ orderId }, 'WebSocket client connected');

      // Access the actual WebSocket through connection.socket
      const socket = connection.socket || connection;

      // Get current order status from database
      try {
        const order = await prisma.order.findUnique({
          where: { orderId },
        });

        if (order) {
          // Send current status immediately
          const statusMessage: WebSocketMessage = {
            type: 'update',
            orderId,
            status: order.status,
            data: {
              selectedDex: order.selectedDex || undefined,
              executedPrice: order.executedPrice ? parseFloat(order.executedPrice.toString()) : undefined,
              txHash: order.txHash || undefined,
              errorMessage: order.errorMessage || undefined,
            },
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(statusMessage));
          logger.info({ orderId, status: order.status }, 'Sent current order status');
        }
      } catch (error) {
        logger.error({ error, orderId }, 'Failed to fetch order status');
      }

      // Send connection confirmation
      const confirmationMessage: WebSocketMessage = {
        type: 'connected',
        orderId,
        timestamp: Date.now(),
      };
      socket.send(JSON.stringify(confirmationMessage));

      // Register connection with WebSocket manager
      if (fastify.services?.wsManager) {
        fastify.services.wsManager.addConnection(orderId, socket);
      }

      // Handle incoming messages (ping/pong for keep-alive)
      socket.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (error) {
          logger.error({ error, orderId }, 'Failed to parse WebSocket message');
        }
      });

      // Handle disconnection
      socket.on('close', () => {
        logger.info({ orderId }, 'WebSocket client disconnected');

        if (fastify.services?.wsManager) {
          fastify.services.wsManager.removeConnection(orderId, socket);
        }
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error({ error, orderId }, 'WebSocket error');
      });
    }
  );
}
