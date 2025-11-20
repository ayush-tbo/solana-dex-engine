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
      if (!websockets.current.has(order.orderId)) {
        connectWebSocket(order.orderId);
      }
    });

    // Cleanup disconnected orders
    websockets.current.forEach((ws, orderId) => {
      if (!orders.find(o => o.orderId === orderId)) {
        ws.close();
        websockets.current.delete(orderId);
      }
    });

    return () => {
      // Cleanup all websockets on unmount
      websockets.current.forEach(ws => ws.close());
      websockets.current.clear();
    };
  }, [orders]);

  const connectWebSocket = (orderId: string) => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/${orderId}`);

    ws.onopen = () => {
      console.log(`WebSocket connected for order ${orderId}`);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log(`Order ${orderId} update:`, data);

        if (data.status) {
          onOrderUpdate(orderId, {
            status: data.status,
            selectedDex: data.selectedDex,
            executedPrice: data.executedPrice?.toString(),
            txHash: data.txHash,
            errorMessage: data.errorMessage,
          });

          // If completed or failed, move to history after a delay
          if (data.status === 'CONFIRMED' || data.status === 'FAILED') {
            setTimeout(() => {
              onOrderComplete(orderId);
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for order ${orderId}:`, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for order ${orderId}`);
      websockets.current.delete(orderId);
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
