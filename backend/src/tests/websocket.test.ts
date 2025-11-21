import WebSocket from 'ws';
import { WebSocketManager } from '../services/websocket-manager';

describe('WebSocket - Lifecycle and Messaging', () => {
  let wsManager: WebSocketManager;
  let mockSocket: any;

  beforeEach(() => {
    wsManager = new WebSocketManager();
    mockSocket = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  });

  afterEach(() => {
    wsManager.closeAll();
  });

  describe('Connection Management', () => {
    test('should add connection successfully', () => {
      wsManager.addConnection('order-1', mockSocket);

      const connections = wsManager.getConnections('order-1');
      expect(connections).toHaveLength(1);
      expect(connections[0]).toBe(mockSocket);
    });

    test('should handle multiple connections for same order', () => {
      const mockSocket2 = { ...mockSocket, send: jest.fn() };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-1', mockSocket2);

      const connections = wsManager.getConnections('order-1');
      expect(connections).toHaveLength(2);
    });

    test('should remove connection on disconnect', () => {
      wsManager.addConnection('order-1', mockSocket);
      wsManager.removeConnection('order-1', mockSocket);

      const connections = wsManager.getConnections('order-1');
      expect(connections).toHaveLength(0);
    });

    test('should handle removing non-existent connection gracefully', () => {
      expect(() => {
        wsManager.removeConnection('order-1', mockSocket);
      }).not.toThrow();
    });

    test('should return empty array for order with no connections', () => {
      const connections = wsManager.getConnections('non-existent-order');
      expect(connections).toEqual([]);
    });
  });

  describe('Message Broadcasting', () => {
    test('should broadcast message to single connection', () => {
      wsManager.addConnection('order-1', mockSocket);

      const message = { type: 'status_update', orderId: 'order-1', status: 'ROUTING' };
      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockSocket.send).toHaveBeenCalledTimes(1);
    });

    test('should broadcast to all connections for same order', () => {
      const mockSocket2 = { ...mockSocket, send: jest.fn() };
      const mockSocket3 = { ...mockSocket, send: jest.fn() };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-1', mockSocket2);
      wsManager.addConnection('order-1', mockSocket3);

      const message = { type: 'status_update', orderId: 'order-1', status: 'CONFIRMED' };
      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockSocket2.send).toHaveBeenCalledWith(JSON.stringify(message));
      expect(mockSocket3.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('should not send to closed connections', () => {
      const closedSocket = {
        ...mockSocket,
        readyState: WebSocket.CLOSED,
        send: jest.fn()
      };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-1', closedSocket);

      const message = { type: 'status_update', orderId: 'order-1', status: 'BUILDING' };
      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalled();
      expect(closedSocket.send).not.toHaveBeenCalled();
    });

    test('should handle send errors gracefully', () => {
      const errorSocket = {
        ...mockSocket,
        send: jest.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
      };

      wsManager.addConnection('order-1', errorSocket);

      expect(() => {
        wsManager.broadcast('order-1', { type: 'test' });
      }).not.toThrow();
    });

    test('should not broadcast to other orders', () => {
      const mockSocket2 = { ...mockSocket, send: jest.fn() };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-2', mockSocket2);

      const message = { type: 'status_update', orderId: 'order-1', status: 'SUBMITTED' };
      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalled();
      expect(mockSocket2.send).not.toHaveBeenCalled();
    });
  });

  describe('Connection Cleanup', () => {
    test('should close all connections for an order', () => {
      wsManager.addConnection('order-1', mockSocket);
      wsManager.closeConnectionsForOrder('order-1');

      expect(mockSocket.close).toHaveBeenCalled();
      const connections = wsManager.getConnections('order-1');
      expect(connections).toHaveLength(0);
    });

    test('should close all connections globally', () => {
      const mockSocket2 = { ...mockSocket, close: jest.fn() };
      const mockSocket3 = { ...mockSocket, close: jest.fn() };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-2', mockSocket2);
      wsManager.addConnection('order-3', mockSocket3);

      wsManager.closeAll();

      expect(mockSocket.close).toHaveBeenCalled();
      expect(mockSocket2.close).toHaveBeenCalled();
      expect(mockSocket3.close).toHaveBeenCalled();
    });

    test('should remove stale connections automatically', () => {
      const closedSocket = { ...mockSocket, readyState: WebSocket.CLOSED };
      const closingSocket = { ...mockSocket, readyState: WebSocket.CLOSING };

      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-1', closedSocket);
      wsManager.addConnection('order-1', closingSocket);

      // Trigger cleanup by broadcasting
      wsManager.broadcast('order-1', { type: 'test' });

      const connections = wsManager.getConnections('order-1');
      expect(connections).toHaveLength(1);
      expect(connections[0]).toBe(mockSocket);
    });
  });

  describe('Status Update Delivery', () => {
    test('should deliver complete order lifecycle updates', () => {
      wsManager.addConnection('order-1', mockSocket);

      const statuses = ['PENDING', 'ROUTING', 'BUILDING', 'SUBMITTED', 'CONFIRMED'];
      statuses.forEach((status) => {
        wsManager.broadcast('order-1', {
          type: 'status_update',
          orderId: 'order-1',
          status,
          timestamp: Date.now(),
        });
      });

      expect(mockSocket.send).toHaveBeenCalledTimes(5);
    });

    test('should deliver transaction hash on confirmation', () => {
      wsManager.addConnection('order-1', mockSocket);

      const message = {
        type: 'status_update',
        orderId: 'order-1',
        status: 'CONFIRMED',
        transactionHash: '5Kx7z...',
        timestamp: Date.now(),
      };

      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('should deliver error updates', () => {
      wsManager.addConnection('order-1', mockSocket);

      const message = {
        type: 'status_update',
        orderId: 'order-1',
        status: 'FAILED',
        error: 'Insufficient liquidity',
        timestamp: Date.now(),
      };

      wsManager.broadcast('order-1', message);

      expect(mockSocket.send).toHaveBeenCalledWith(JSON.stringify(message));
    });
  });

  describe('Connection State Management', () => {
    test('should track active connections count', () => {
      wsManager.addConnection('order-1', mockSocket);
      wsManager.addConnection('order-2', { ...mockSocket });
      wsManager.addConnection('order-3', { ...mockSocket });

      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(3);
      expect(stats.totalOrders).toBe(3);
    });

    test('should update stats after connection removal', () => {
      wsManager.addConnection('order-1', mockSocket);
      wsManager.removeConnection('order-1', mockSocket);

      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(0);
      expect(stats.totalOrders).toBe(0);
    });

    test('should handle concurrent connection operations', async () => {
      const sockets = Array.from({ length: 10 }, () => ({ ...mockSocket, send: jest.fn() }));

      // Add connections concurrently
      await Promise.all(
        sockets.map((socket, i) => wsManager.addConnection(`order-${i}`, socket))
      );

      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBe(10);
    });
  });
});
