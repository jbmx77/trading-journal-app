import React from 'react';
import { FilterState, PnlOutcome } from '../types';

interface TradeFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
  tradeCount: number;
  totalTradeCount: number;
  uniqueAssets: string[];
}

const TradeFilters: React.FC<TradeFiltersProps> = ({ filters, onFilterChange, onReset, tradeCount, totalTradeCount, uniqueAssets }) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ [e.target.name]: e.target.value });
  };
  
  const handlePnlChange = (outcome: PnlOutcome) => {
    onFilterChange({ pnlOutcome: outcome });
  };
  
  return (
    <div className="bg-surface p-4 rounded-xl mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
        {/* Date Range */}
        <div className="flex flex-col">
          <label htmlFor="startDate" className="text-sm font-medium text-text_secondary mb-1">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filters.startDate}
            onChange={handleInputChange}
            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="endDate" className="text-sm font-medium text-text_secondary mb-1">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate}
            onChange={handleInputChange}
            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        
        {/* Asset Filter */}
        <div className="flex flex-col">
          <label htmlFor="asset" className="text-sm font-medium text-text_secondary mb-1">Asset</label>
          <input
            type="text"
            id="asset"
            name="asset"
            list="asset-filter-list"
            placeholder="e.g., BTC/USDT"
            value={filters.asset}
            onChange={handleInputChange}
            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <datalist id="asset-filter-list">
            {uniqueAssets.map(asset => (
              <option key={asset} value={asset} />
            ))}
          </datalist>
        </div>
        
        {/* Trade ID Filter */}
        <div className="flex flex-col">
          <label htmlFor="tradeId" className="text-sm font-medium text-text_secondary mb-1">Trade ID Range</label>
          <input
            type="text"
            id="tradeId"
            name="tradeId"
            placeholder="e.g., 4-19"
            value={filters.tradeId}
            onChange={handleInputChange}
            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* PnL Outcome */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-text_secondary mb-1">Outcome</label>
          <div className="flex bg-secondary rounded-lg p-1">
            {(['all', 'win', 'loss'] as PnlOutcome[]).map(outcome => (
              <button
                key={outcome}
                onClick={() => handlePnlChange(outcome)}
                className={`w-full py-1.5 px-2 text-sm rounded-md capitalize transition-colors duration-200 ${
                  filters.pnlOutcome === outcome
                    ? 'bg-surface_hover text-text_primary font-semibold shadow'
                    : 'text-text_secondary hover:text-text_primary'
                }`}
              >
                {outcome}
              </button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 h-[46px]"
        >
          Reset Filters
        </button>
      </div>
      <div className="text-right text-sm text-text_secondary mt-3 pr-1">
        Showing {tradeCount} of {totalTradeCount} trades.
      </div>
    </div>
  );
};

export default TradeFilters;