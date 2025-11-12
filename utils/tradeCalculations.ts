import { Trade, DashboardMetrics } from '../types';

export const calculateMetrics = (trades: Trade[], initialCapital: number): DashboardMetrics => {
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  if (closedTrades.length === 0) {
    return {
      totalPnl: 0,
      winRate: 0,
      lossRate: 0,
      totalWins: 0,
      totalLosses: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      totalTrades: 0,
      maxWinStreakTrades: 0,
      maxLossStreakTrades: 0,
      currentStreak: { type: 'none', count: 0 },
      chartData: [{name: 'Start', pnl: 0}],
      equityChartData: [{name: 'Start', equity: initialCapital}],
    };
  }

  const wins = closedTrades.filter(t => t.pnl! > 0);
  const losses = closedTrades.filter(t => t.pnl! <= 0);

  const totalPnl = closedTrades.reduce((acc, t) => acc + t.pnl!, 0);
  const totalWins = wins.length;
  const totalLosses = losses.length;
  const totalTrades = closedTrades.length;

  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (totalLosses / totalTrades) * 100 : 0;

  const totalWinPnl = wins.reduce((acc, t) => acc + t.pnl!, 0);
  const totalLossPnl = losses.reduce((acc, t) => acc + t.pnl!, 0);

  const averageWin = totalWins > 0 ? totalWinPnl / totalWins : 0;
  const averageLoss = totalLosses > 0 ? totalLossPnl / totalLosses : 0;
  
  const profitFactor = totalLossPnl !== 0 ? Math.abs(totalWinPnl / totalLossPnl) : 0;

  // chart data needs to be sorted by date ascending
  const sortedTrades = [...closedTrades].sort((a,b) => a.date.getTime() - b.date.getTime());
  
  let cumulativePnl = 0;
  const chartData = sortedTrades.map((t, index) => {
    cumulativePnl += t.pnl!;
    return {
      name: `Trade ${index + 1}`,
      pnl: cumulativePnl,
    };
  });
  chartData.unshift({name: 'Start', pnl: 0});
  
  cumulativePnl = 0; // Reset for equity calculation
  const equityChartData = sortedTrades.map((t, index) => {
    cumulativePnl += t.pnl!;
    return {
      name: `Trade ${index + 1}`,
      equity: initialCapital + cumulativePnl,
    };
  });
  equityChartData.unshift({name: 'Start', equity: initialCapital});

  // Calculate max trade streaks
  let maxWinStreakTrades = 0;
  let currentWinStreakTrades = 0;
  let maxLossStreakTrades = 0;
  let currentLossStreakTrades = 0;

  for (const trade of sortedTrades) {
      if (trade.pnl! > 0) {
          currentWinStreakTrades++;
          currentLossStreakTrades = 0;
      } else {
          currentLossStreakTrades++;
          currentWinStreakTrades = 0;
      }
      maxWinStreakTrades = Math.max(maxWinStreakTrades, currentWinStreakTrades);
      maxLossStreakTrades = Math.max(maxLossStreakTrades, currentLossStreakTrades);
  }

  // Calculate current trade streak
  const currentStreak: { type: 'win' | 'loss' | 'none'; count: number; } = { type: 'none', count: 0 };
  if (sortedTrades.length > 0) {
      const lastTrade = sortedTrades[sortedTrades.length - 1];
      const streakType = lastTrade.pnl! > 0 ? 'win' : 'loss';
      currentStreak.type = streakType;
      
      for (let i = sortedTrades.length - 1; i >= 0; i--) {
          const currentTradeIsWin = sortedTrades[i].pnl! > 0;
          if ((streakType === 'win' && currentTradeIsWin) || (streakType === 'loss' && !currentTradeIsWin)) {
              currentStreak.count++;
          } else {
              break;
          }
      }
  }

  return {
    totalPnl,
    winRate,
    lossRate,
    totalWins,
    totalLosses,
    averageWin,
    averageLoss,
    profitFactor,
    totalTrades,
    maxWinStreakTrades,
    maxLossStreakTrades,
    currentStreak,
    chartData,
    equityChartData,
  };
};

export const calculateCurrentLosingTradeStreak = (trades: Trade[]): number => {
  const closedTrades = trades.filter(t => t.status === 'closed').sort((a, b) => a.date.getTime() - b.date.getTime());

  if (closedTrades.length === 0) {
      return 0;
  }

  let currentLosingStreak = 0;
  // Iterate backwards from the most recent trade
  for (let i = closedTrades.length - 1; i >= 0; i--) {
      const trade = closedTrades[i];
      if (trade.pnl !== undefined && trade.pnl <= 0) {
          currentLosingStreak++;
      } else {
          // The streak is broken
          break;
      }
  }
  return currentLosingStreak;
};