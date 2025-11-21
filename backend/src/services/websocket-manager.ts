import { logger } from '../utils/logger';
import type { ClientConnection, OrderStatusUpdate, WebSocketMessage } from '../types';

export class WebSocketManager {
  private clients: Map<string, Set<ClientConnection>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  /**
   * Add a new WebSocket connection
   */
  addConnection(orderId: string, socket: any): void {
    const client: ClientConnection = {
      orderId,
      socket: socket,
      isAlive: true,
      connectedAt: new Date(),
    };

    if (!this.clients.has(orderId)) {
      this.clients.set(orderId, new Set());
    }

    this.clients.get(orderId)!.add(client);

    // Setup pong handler
    socket.on('pong', () => {
      client.isAlive = true;
    });

    logger.info({ orderId, totalConnections: this.clients.get(orderId)!.size }, 'WebSocket client added');
  }

  /**
   * Remove a WebSocket connection
   */
  removeConnection(orderId: string, connection: any): void {
    const connections = this.clients.get(orderId);
    if (!connections) return;

    // Find and remove the connection
    for (const client of connections) {
      if (client.socket === connection) {
        connections.delete(client);
        logger.info({ orderId, remainingConnections: connections.size }, 'WebSocket client removed');
        break;
      }
    }

    // Clean up empty sets
    if (connections.size === 0) {
      this.clients.delete(orderId);
      logger.debug({ orderId }, 'Removed empty connection set');
    }
  }

  /**
   * Broadcast order status update to all connected clients
   */
  broadcastOrderUpdate(orderId: string, statusUpdate: OrderStatusUpdate): void {
    const connections = this.clients.get(orderId);
    if (!connections || connections.size === 0) {
      logger.debug({ orderId }, 'No connections to broadcast to');
      return;
    }

    const message: WebSocketMessage = {
      type: 'update',
      orderId,
      status: statusUpdate.type,
      data: statusUpdate.data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    let successCount = 0;
    let failCount = 0;

    connections.forEach((client) => {
      try {
        if (this.sendToClient(client, messageStr)) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        logger.error({ error, orderId }, 'Failed to send message to client');
      }
    });

    logger.info(
      { orderId, status: statusUpdate.type, successCount, failCount },
      'Broadcast order update'
    );
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(client: ClientConnection, message: string): boolean {
    try {
      const socket = client.socket.socket || client.socket;

      if (socket.readyState === 1) {
        // WebSocket.OPEN
        socket.send(message);
        return true;
      } else {
        logger.warn({ orderId: client.orderId, readyState: socket.readyState }, 'Socket not open');
        return false;
      }
    } catch (error) {
      logger.error({ error, orderId: client.orderId }, 'Failed to send message');
      return false;
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      let totalClients = 0;
      let deadClients = 0;

      this.clients.forEach((connections, orderId) => {
        connections.forEach((client) => {
          totalClients++;

          if (!client.isAlive) {
            // Client didn't respond to ping, terminate
            try {
              const socket = client.socket.socket || client.socket;
              socket.terminate();
              connections.delete(client);
              deadClients++;
              logger.debug({ orderId }, 'Terminated dead connection');
            } catch (error) {
              logger.error({ error, orderId }, 'Failed to terminate connection');
            }
            return;
          }

          // Mark as not alive and send ping
          client.isAlive = false;
          try {
            const socket = client.socket.socket || client.socket;
            socket.ping();
          } catch (error) {
            logger.error({ error, orderId }, 'Failed to ping client');
          }
        });

        // Clean up empty connection sets
        if (connections.size === 0) {
          this.clients.delete(orderId);
        }
      });

      if (totalClients > 0 || deadClients > 0) {
        logger.debug({ totalClients, deadClients }, 'Heartbeat completed');
      }
    }, 30000); // 30 seconds

    logger.info('WebSocket heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('WebSocket heartbeat stopped');
    }
  }

  /**
   * Get connection count for an order
   */
  getConnectionCount(orderId: string): number {
    return this.clients.get(orderId)?.size || 0;
  }

  /**
   * Get total connection count
   */
  getTotalConnectionCount(): number {
    let total = 0;
    this.clients.forEach((connections) => {
      total += connections.size;
    });
    return total;
  }

  /**
   * Close all connections gracefully
   */
  closeAll(): void {
    logger.info({ totalOrders: this.clients.size }, 'Closing all WebSocket connections');

    this.clients.forEach((connections, orderId) => {
      connections.forEach((client) => {
        try {
          const socket = client.socket.socket || client.socket;
          socket.close(1000, 'Server shutting down');
        } catch (error) {
          logger.error({ error, orderId }, 'Failed to close connection');
        }
      });
    });

    this.clients.clear();
    this.stopHeartbeat();

    logger.info('All WebSocket connections closed');
  }
}
