import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import OrderForm from './components/OrderForm';
import ActiveOrders from './components/ActiveOrders';
import OrderHistory from './components/OrderHistory';
import StatsPanel from './components/StatsPanel';
import { Order } from './types';

const API_BASE_URL = 'http://localhost:3000';

function App() {
  const [activeOrders, setActiveOrders] = useState<Map<string, Order>>(new Map());
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    failed: 0,
    active: 0,
  });

  // Load order history on mount
  useEffect(() => {
    loadOrderHistory();
    const interval = setInterval(loadOrderHistory, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Update stats whenever orders change
  useEffect(() => {
    const allOrders = [...Array.from(activeOrders.values()), ...orderHistory];
    setStats({
      total: allOrders.length,
      confirmed: allOrders.filter(o => o.status === 'CONFIRMED').length,
      failed: allOrders.filter(o => o.status === 'FAILED').length,
      active: activeOrders.size,
    });
  }, [activeOrders, orderHistory]);

  const loadOrderHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders?limit=50`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        // Fetch full details for completed orders missing DEX selection
        const ordersWithDetails = await Promise.all(
          data.data.map(async (order: Order) => {
            if ((order.status === 'CONFIRMED' || order.status === 'FAILED') && !order.selectedDex) {
              try {
                const detailResponse = await fetch(`${API_BASE_URL}/api/orders/${order.orderId}`);
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  return detailData.data || order;
                }
              } catch (err) {
                console.error(`Error fetching details for ${order.orderId}:`, err);
              }
            }
            return order;
          })
        );

        // Only show completed orders in history
        const completedOrders = ordersWithDetails.filter(
          o => o.status === 'CONFIRMED' || o.status === 'FAILED'
        );
        setOrderHistory(completedOrders);
      }
    } catch (error) {
      console.error('Error loading order history:', error);
    }
  };

  const handleOrderSubmit = (order: Order) => {
    setActiveOrders(prev => new Map(prev).set(order.orderId, order));
  };

  const handleOrderUpdate = (orderId: string, updates: Partial<Order>) => {
    setActiveOrders(prev => {
      const newMap = new Map(prev);
      const order = newMap.get(orderId);
      if (order) {
        newMap.set(orderId, { ...order, ...updates });
      }
      return newMap;
    });
  };

  const handleOrderComplete = (orderId: string) => {
    const order = activeOrders.get(orderId);
    if (order) {
      setOrderHistory(prev => {
        // Check if order already exists in history
        const exists = prev.find(o => o.orderId === orderId);
        if (exists) {
          // Update existing order
          return prev.map(o => o.orderId === orderId ? order : o);
        }
        // Add new order to history
        return [order, ...prev];
      });
      setActiveOrders(prev => {
        const newMap = new Map(prev);
        newMap.delete(orderId);
        return newMap;
      });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <Activity className="w-10 h-10 text-purple-400 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Solana DEX Engine
            </h1>
          </div>
          <p className="text-purple-300 text-lg">
            Real-time order execution with Raydium & Meteora
          </p>
        </header>

        {/* Stats Panel */}
        <StatsPanel stats={stats} />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Order Form */}
          <div className="lg:col-span-1">
            <OrderForm onOrderSubmit={handleOrderSubmit} />
          </div>

          {/* Active Orders */}
          <div className="lg:col-span-2">
            <ActiveOrders
              orders={Array.from(activeOrders.values())}
              onOrderUpdate={handleOrderUpdate}
              onOrderComplete={handleOrderComplete}
            />
          </div>
        </div>

        {/* Order History */}
        <OrderHistory orders={orderHistory} />
      </div>
    </div>
  );
}

export default App;
