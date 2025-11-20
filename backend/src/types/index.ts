import { OrderStatus, DexType } from '@prisma/client';

export { OrderStatus, DexType };

export interface Quote {
  dex: DexType;
  inputAmount: bigint;
  outputAmount: bigint;
  price: number;
  fee: number;
  poolId: string;
  slippage: number;
}

export interface ExecutionResult {
  signature: string;
  executedPrice: number;
  executedAmount: bigint;
  dex: DexType;
}

export interface OrderJobData {
  orderId: string;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  slippage: number;
  userWallet: string;
  timestamp: number;
}

export interface OrderStatusUpdate {
  type: OrderStatus;
  data: Record<string, any>;
}

export interface ClientConnection {
  orderId: string;
  socket: any; // WebSocket type
  isAlive: boolean;
  connectedAt: Date;
}

export interface WebSocketMessage {
  type: 'connected' | 'update' | 'error';
  orderId?: string;
  status?: string;
  data?: Record<string, any>;
  timestamp: number;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: number;
  services: {
    database: boolean;
    redis: boolean;
    blockchain: boolean;
  };
  version: string;
}

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  wsUrl: string;
  createdAt: Date;
}

export interface OrderHistoryItem {
  id: string;
  orderId: string;
  userWallet: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string | null;
  status: OrderStatus;
  selectedDex: DexType | null;
  executedPrice: string | null;
  txHash: string | null;
  slippage: string;
  errorMessage: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
