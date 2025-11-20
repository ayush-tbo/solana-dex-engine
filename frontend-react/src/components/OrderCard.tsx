import { Clock, TrendingUp, CheckCircle, XCircle, Loader, ArrowRight, ExternalLink } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderCardProps {
  order: Order;
}

const statusConfig: Record<OrderStatus, { icon: any; color: string; bg: string; text: string; progress: number }> = {
  PENDING: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', text: 'Pending', progress: 10 },
  ROUTING: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/20', text: 'Routing', progress: 30 },
  BUILDING: { icon: Loader, color: 'text-purple-400', bg: 'bg-purple-500/20', text: 'Building', progress: 50 },
  SUBMITTED: { icon: Loader, color: 'text-orange-400', bg: 'bg-orange-500/20', text: 'Submitted', progress: 70 },
  CONFIRMED: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', text: 'Confirmed', progress: 100 },
  FAILED: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', text: 'Failed', progress: 100 },
};

export default function OrderCard({ order }: OrderCardProps) {
  const config = statusConfig[order.status];
  const Icon = config.icon;

  const getTokenSymbol = (address: string) => {
    return address === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'USDC';
  };

  const amountInToken = (parseFloat(order.amountIn) / 1000000000).toFixed(4);
  const tokenInSymbol = getTokenSymbol(order.tokenIn);
  const tokenOutSymbol = getTokenSymbol(order.tokenOut);

  return (
    <div className="glass-dark rounded-xl p-4 animate-slide-up hover:scale-[1.02] transition-transform">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color} ${config.icon === Loader ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <p className="text-xs text-purple-300 font-mono">
              {order.orderId.substring(0, 8)}...
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
          {config.text}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-purple-200 font-semibold">
            {amountInToken} {tokenInSymbol}
          </span>
          <ArrowRight className="w-4 h-4 text-purple-400" />
          <span className="text-purple-200 font-semibold">
            {tokenOutSymbol}
          </span>
        </div>

        {order.selectedDex && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-300">DEX:</span>
            <span className="text-white font-semibold bg-purple-500/20 px-2 py-0.5 rounded">
              {order.selectedDex}
            </span>
          </div>
        )}

        {order.executedPrice && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-300">Price:</span>
            <span className="text-white font-semibold">
              {parseFloat(order.executedPrice).toFixed(4)}
            </span>
          </div>
        )}

        {order.txHash && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-300">TX:</span>
            <a
              href={`https://solscan.io/tx/${order.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition font-mono text-xs"
              title="Mock transaction - will show 'Not Found' on Solscan until real DEX integration"
            >
              <span>{order.txHash.substring(0, 8)}...</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {order.errorMessage && (
          <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
            {order.errorMessage}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${config.bg} transition-all duration-500 ease-out`}
          style={{ width: `${config.progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}
