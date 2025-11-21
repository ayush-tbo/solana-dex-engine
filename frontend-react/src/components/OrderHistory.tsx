import { Clock, ExternalLink } from 'lucide-react';
import { Order } from '../types';

interface OrderHistoryProps {
  orders: Order[];
}

export default function OrderHistory({ orders }: OrderHistoryProps) {
  const getTokenSymbol = (address: string) => {
    return address === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CONFIRMED: 'bg-green-500/20 text-green-400',
      FAILED: 'bg-red-500/20 text-red-400',
      PENDING: 'bg-yellow-500/20 text-yellow-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold">Order History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">Time</th>
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">Status</th>
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">Swap</th>
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">DEX</th>
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">Price</th>
              <th className="text-left py-3 px-4 text-purple-300 font-semibold text-sm">TX</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-purple-300">
                  No order history yet
                </td>
              </tr>
            ) : (
              orders.slice(0, 20).map((order, index) => {
                const amountInToken = (parseFloat(order.amountIn) / 1000000000).toFixed(4);
                const tokenInSymbol = getTokenSymbol(order.tokenIn);
                const tokenOutSymbol = getTokenSymbol(order.tokenOut);

                return (
                  <tr
                    key={order.orderId}
                    className="border-b border-white/5 hover:bg-white/5 transition animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-3 px-4 text-sm">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {amountInToken} {tokenInSymbol} → {tokenOutSymbol}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {order.selectedDex ? (
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-semibold">
                          {order.selectedDex}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono">
                      {order.executedPrice ? parseFloat(order.executedPrice).toFixed(4) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {order.txHash ? (
                        <a
                          href={`https://solscan.io/tx/${order.txHash}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition"
                          title="View real transaction on Solana devnet"
                        >
                          <span className="font-mono">{order.txHash.substring(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
