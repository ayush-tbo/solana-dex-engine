import { useState } from 'react';
import { Send, Zap } from 'lucide-react';
import { Order } from '../types';

const API_BASE_URL = 'http://localhost:3000';
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';
const USDC_ADDRESS = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'; // Devnet USDC

interface OrderFormProps {
  onOrderSubmit: (order: Order) => void;
}

export default function OrderForm({ onOrderSubmit }: OrderFormProps) {
  const [tokenIn, setTokenIn] = useState(SOL_ADDRESS);
  const [tokenOut, setTokenOut] = useState(USDC_ADDRESS);
  const [amount, setAmount] = useState('1000000000'); // 1 SOL
  const [slippage, setSlippage] = useState('0.5');
  const [userWallet] = useState('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIn,
          tokenOut,
          amount,
          slippage: parseFloat(slippage),
          userWallet,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to submit order');
      }

      const data = await response.json();
      const order: Order = {
        orderId: data.orderId,
        userWallet,
        tokenIn,
        tokenOut,
        amountIn: amount,
        status: data.status,
        slippage,
        retryCount: 0,
        createdAt: data.createdAt,
        updatedAt: data.createdAt,
      };

      onOrderSubmit(order);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert(error instanceof Error ? error.message : 'Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  const submitMultiple = async (count: number) => {
    for (let i = 0; i < count; i++) {
      const randomAmount = Math.floor((Math.random() * 4.9 + 0.1) * 1000000000);
      setAmount(randomAmount.toString());
      await new Promise(resolve => setTimeout(resolve, 200));
      const event = new Event('submit', { bubbles: true, cancelable: true });
      document.querySelector('form')?.dispatchEvent(event);
    }
  };

  const getTokenSymbol = (address: string) => {
    return address === SOL_ADDRESS ? 'SOL' : 'USDC';
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Send className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold">Submit Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-2">
            Token In
          </label>
          <select
            value={tokenIn}
            onChange={(e) => setTokenIn(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition"
          >
            <option value={SOL_ADDRESS}>SOL</option>
            <option value={USDC_ADDRESS}>USDC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-2">
            Token Out
          </label>
          <select
            value={tokenOut}
            onChange={(e) => setTokenOut(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition"
          >
            <option value={USDC_ADDRESS}>USDC</option>
            <option value={SOL_ADDRESS}>SOL</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-2">
            Amount (lamports)
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition"
            required
          />
          <p className="text-xs text-purple-300 mt-1">
            {(parseFloat(amount) / 1000000000).toFixed(4)} {getTokenSymbol(tokenIn)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-purple-200 mb-2">
            Slippage Tolerance (%)
          </label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            step="0.1"
            min="0.1"
            max="5"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Order</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-semibold text-purple-200">Quick Test</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[3, 5, 10].map(count => (
            <button
              key={count}
              onClick={() => submitMultiple(count)}
              className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition"
            >
              {count} Orders
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
