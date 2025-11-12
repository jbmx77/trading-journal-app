import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardMetrics } from '../types';

interface DashboardProps {
  metrics: DashboardMetrics;
  initialCapital: number;
  onInitialCapitalChange: (value: number) => void;
}

const MetricCard: React.FC<{ title: string; value: string; colorClass?: string }> = ({ title, value, colorClass = 'text-text_primary' }) => (
  <div className="bg-surface p-4 rounded-xl flex flex-col justify-between">
    <p className="text-sm text-text_secondary">{title}</p>
    <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
  </div>
);

const ChartContainer: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-surface p-6 rounded-xl h-80 w-full flex flex-col relative">
        <h3 className="text-lg font-semibold mb-4 text-text_primary">{title}</h3>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ metrics, initialCapital, onInitialCapitalChange }) => {
    const { totalPnl, winRate, lossRate, totalWins, totalLosses, profitFactor, totalTrades, maxWinStreakTrades, maxLossStreakTrades, currentStreak, chartData, equityChartData } = metrics;

    const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
    
    return (
        <div className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <MetricCard title="Total PnL" value={formatCurrency(totalPnl)} colorClass={totalPnl >= 0 ? 'text-green' : 'text-red'} />
                <MetricCard title="Total Trades" value={totalTrades.toString()} />
                <MetricCard title="Win / Loss" value={`${totalWins} / ${totalLosses}`} />
                <MetricCard title="Win / Loss Rate" value={`${winRate.toFixed(1)}% / ${lossRate.toFixed(1)}%`} />
                <MetricCard title="Profit Factor" value={profitFactor.toFixed(2)} colorClass={profitFactor >= 1 ? 'text-green' : 'text-red'} />
                <div className="bg-surface p-4 rounded-xl flex flex-col justify-between">
                    <p className="text-sm text-text_secondary">Trade Streaks</p>
                    <div className="mt-1 space-y-1">
                       {currentStreak.count > 0 ? (
                            <p className="text-lg font-bold">
                                <span className="text-text_secondary">Current: </span>
                                <span className={currentStreak.type === 'win' ? 'text-green' : 'text-red'}>
                                    {currentStreak.count} {currentStreak.type === 'win' ? 'Win' : 'Loss'}{currentStreak.count > 1 ? 's' : ''}
                                </span>
                            </p>
                        ) : (
                            <p className="text-lg font-bold text-text_secondary">Current: —</p>
                        )}
                        <p className="text-sm font-semibold">
                            <span className="text-text_secondary">Max: </span>
                            <span className="text-green">{maxWinStreakTrades}W</span> / <span className="text-red">{maxLossStreakTrades}L</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <ChartContainer title="Cumulative PnL">
                    {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#64d2ff" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#64d2ff" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" stroke="#8e8e93" tick={{fontSize: 12}} />
                            <YAxis stroke="#8e8e93" tickFormatter={(value) => `$${value}`} tick={{fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #444446', borderRadius: '0.5rem' }}
                                labelStyle={{ color: '#f2f2f7' }}
                                formatter={(value: number) => [formatCurrency(value), 'Cumulative PnL']}
                            />
                            <Area type="monotone" dataKey="pnl" stroke="#64d2ff" fillOpacity={1} fill="url(#colorPnl)" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text_tertiary">
                            <p>Not enough data for PnL chart.</p>
                        </div>
                    )}
                </ChartContainer>

                <ChartContainer title="Account Equity">
                     <div className="absolute top-4 right-6 z-10">
                        <label htmlFor="initialCapitalInput" className="text-sm text-text_secondary mr-2">Starting Capital:</label>
                        <input
                            id="initialCapitalInput"
                            type="number"
                            value={initialCapital}
                            onChange={(e) => onInitialCapitalChange(parseFloat(e.target.value) || 0)}
                            className="bg-secondary text-text_primary w-32 p-1.5 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="e.g., 1000"
                        />
                    </div>
                    {equityChartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={equityChartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0a84ff" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#0a84ff" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis dataKey="name" stroke="#8e8e93" tick={{fontSize: 12}} />
                            <YAxis stroke="#8e8e93" tickFormatter={(value) => `$${value}`} tick={{fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1c1c1e', border: '1px solid #444446', borderRadius: '0.5rem' }}
                                labelStyle={{ color: '#f2f2f7' }}
                                formatter={(value: number) => [formatCurrency(value), 'Account Equity']}
                            />
                            <Area type="monotone" dataKey="equity" stroke="#0a84ff" fillOpacity={1} fill="url(#colorEquity)" />
                        </AreaChart>
                    </ResponsiveContainer>
                     ) : (
                        <div className="flex items-center justify-center h-full text-text_tertiary text-center px-4">
                            <p>Set your starting capital and add trades to see your account's equity curve over time.</p>
                        </div>
                    )}
                </ChartContainer>
            </div>
        </div>
    );
};

export default Dashboard;