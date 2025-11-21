import { useEffect, useRef } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { Order, WebSocketMessage } from '../types';
import OrderCard from './OrderCard';

// Use the current host for WebSocket (works with Vite proxy)
const WS_BASE_URL = window.location.protocol === 'https:'
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`;

interface ActiveOrdersProps {
  orders: Order[];
  onOrderUpdate: (orderId: string, updates: Partial<Order>) => void;
  onOrderComplete: (orderId: string) => void;
}

export default function ActiveOrders({ orders, onOrderUpdate, onOrderComplete }: ActiveOrdersProps) {
  const websockets = useRef<Map<string, WebSocket>>(new Map());

  useEffect(() => {
    // Connect WebSocket for each new order
    orders.forEach(order => {
      const existing = websockets.current.get(order.orderId);
      if (!existing || existing.readyState === WebSocket.CLOSED) {
        connectWebSocket(order.orderId);
      }
    });

    // Cleanup disconnected orders
    websockets.current.forEach((ws, orderId) => {
      if (!orders.find(o => o.orderId === orderId)) {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
        websockets.current.delete(orderId);
      }
    });
  }, [orders]);

  const connectWebSocket = (orderId: string) => {
    // Check if already connecting/connected
    const existing = websockets.current.get(orderId);
    if (existing && (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
      console.log(`[WS] Already connected to order ${orderId}`);
      return;
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/${orderId}`);

    ws.onopen = () => {
      console.log(`[WS] Connected to order ${orderId}`);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log(`[WS] Order ${orderId} - Status: ${message.status}`, message);

        if (message.status) {
          // Extract data from nested data object or top level
          const messageData = message.data || {};

          const updates = {
            status: message.status,
            selectedDex: messageData.selectedDex || messageData.dex,
            executedPrice: messageData.executedPrice?.toString(),
            txHash: messageData.txHash || messageData.signature,
            errorMessage: messageData.error || messageData.errorMessage,
          };

          console.log(`[WS] Updating order ${orderId} with:`, updates);
          onOrderUpdate(orderId, updates);

          // If completed or failed, move to history after a delay
          if (message.status === 'CONFIRMED' || message.status === 'FAILED') {
            setTimeout(() => {
              console.log(`[WS] Moving order ${orderId} to history`);
              onOrderComplete(orderId);
            }, 3000);
          }
        }
      } catch (error) {
        console.error(`[WS ERROR] Order ${orderId}:`, error);
      }
    };

    ws.onerror = (error) => {
      console.error(`[WS ERROR] Order ${orderId}:`, error);
    };

    ws.onclose = (event) => {
      console.log(`[WS] Closed for order ${orderId}. Code: ${event.code}, Reason: ${event.reason}`);
      websockets.current.delete(orderId);

      // Don't auto-reconnect - let the order complete naturally
      // If the order is still active and connection closed unexpectedly, the useEffect will reconnect
    };

    websockets.current.set(orderId, ws);
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-6 h-6 text-purple-400 animate-pulse" />
        <h2 className="text-2xl font-bold">Active Orders</h2>
        <span className="ml-auto bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold">
          {orders.length} active
        </span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-purple-300">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No active orders</p>
            <p className="text-sm mt-2 opacity-75">Submit an order to get started</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.orderId} order={order} />
          ))
        )}
      </div>
    </div>
  );
}
