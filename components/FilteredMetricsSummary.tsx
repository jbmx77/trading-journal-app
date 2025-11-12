import React from 'react';

interface FilteredMetricsSummaryProps {
  totalPnl: number;
  profitFactor: number;
  winRate: number;
}

const SummaryCard: React.FC<{ title: string; value: string; colorClass?: string }> = ({ title, value, colorClass = 'text-text_primary' }) => (
  <div className="bg-surface p-4 rounded-xl">
    <p className="text-sm text-text_secondary">{title}</p>
    <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
  </div>
);

const FilteredMetricsSummary: React.FC<FilteredMetricsSummaryProps> = ({ totalPnl, profitFactor, winRate }) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-text_secondary mb-3">Filtered Selection Stats</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard 
          title="Filtered PnL" 
          value={`$${totalPnl.toFixed(2)}`} 
          colorClass={totalPnl >= 0 ? 'text-green' : 'text-red'} 
        />
        <SummaryCard 
          title="Win Rate" 
          value={`${winRate.toFixed(1)}%`} 
        />
        <SummaryCard 
          title="Profit Factor" 
          value={profitFactor.toFixed(2)} 
          colorClass={profitFactor >= 1 ? 'text-green' : 'text-red'} 
        />
      </div>
    </div>
  );
};

export default FilteredMetricsSummary;
