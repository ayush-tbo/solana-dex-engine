import type { FastifyInstance, FastifyRequest } from 'fastify';
import { logger } from '../utils/logger';
import type { WebSocketMessage } from '../types';

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

      // Send connection confirmation
      const confirmationMessage: WebSocketMessage = {
        type: 'connected',
        orderId,
        timestamp: Date.now(),
      };

      // Access the actual WebSocket through connection.socket
      const socket = connection.socket || connection;
      socket.send(JSON.stringify(confirmationMessage));

      // Register connection with WebSocket manager
      // Create a connection object with socket property for compatibility
      const connectionWrapper = connection.socket ? connection : { socket: connection };
      if (fastify.services?.wsManager) {
        fastify.services.wsManager.addConnection(orderId, connectionWrapper);
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
          fastify.services.wsManager.removeConnection(orderId, connectionWrapper);
        }
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        logger.error({ error, orderId }, 'WebSocket error');
      });
    }
  );
}
