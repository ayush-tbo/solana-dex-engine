export type OrderStatus = 'PENDING' | 'ROUTING' | 'BUILDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';
export type DexType = 'RAYDIUM' | 'METEORA';

export interface Order {
  orderId: string;
  userWallet: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  status: OrderStatus;
  selectedDex?: DexType;
  executedPrice?: string;
  txHash?: string;
  slippage: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  quotes?: Quote[];
}

export interface Quote {
  dex: DexType;
  inputAmount: string;
  outputAmount: string;
  price: number;
  fee: number;
  poolId: string;
  wasSelected?: boolean;
}

export interface WebSocketMessage {
  type: string;
  orderId: string;
  status?: OrderStatus;
  selectedDex?: DexType;
  executedPrice?: number;
  txHash?: string;
  errorMessage?: string;
  quotes?: Quote[];
  timestamp: number;
}
