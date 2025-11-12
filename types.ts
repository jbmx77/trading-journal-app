export enum TradeDirection {
    Long = 'LONG',
    Short = 'SHORT',
}
  
export interface Trade {
    id: number;
    date: Date;
    asset: string;
    direction: TradeDirection;
    entryPrice: number;
    exitPrice?: number; // Optional for open trades
    size: number;
    pnl?: number; // Optional for open trades
    journal: string;
    status: 'open' | 'closed';
    analysis?: string;
    stopLoss?: number;
    takeProfit?: number;
    leverage?: string;
}

export interface Strategy {
  id: string;
  name: string;
  content: string;
}

export interface Audit {
  id: string;
  date: string;
  parameters: {
    type: 'lastN' | 'dateRange' | 'idRange';
    value: { n?: number; startDate?: string; endDate?: string; startId?: number; endId?: number };
    tradeCount: number;
    strategyName?: string;
  };
  result: string;
}

export interface TradeSuggestion {
    entry: number; // For LIMIT orders, or an indicative price for MARKET.
    stopLoss: number;
    takeProfit: number;
    rationale: string;
    direction: TradeDirection;
    orderType: 'LIMIT' | 'MARKET';
    minEntry?: number; // For MARKET orders
    maxEntry?: number; // For MARKET orders
    invalidation?: string; // For LIMIT orders
}

export interface DashboardMetrics {
    totalPnl: number;
    winRate: number;
    lossRate: number;
    totalWins: number;
    totalLosses: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    totalTrades: number;
    maxWinStreakTrades: number;
    maxLossStreakTrades: number;
    currentStreak: { type: 'win' | 'loss' | 'none'; count: number; };
    chartData: { name: string; pnl: number }[];
    equityChartData: { name: string; equity: number }[];
}

export type PnlOutcome = 'all' | 'win' | 'loss';

export interface FilterState {
  startDate: string;
  endDate: string;
  asset: string;
  pnlOutcome: PnlOutcome;
  tradeId: string;
}

// This represents the data structure of the JSON backup file.
export interface BackupData {
    trades: (Omit<Trade, 'date' | 'leverage'> & { date: string; leverage?: string })[];
    initialCapital: number;
    strategies: Strategy[];
    activeStrategyId: string | null;
    timestamp: string;
}