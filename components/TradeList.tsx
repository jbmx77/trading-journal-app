import React, { useState, useEffect } from 'react';
import { Trade, TradeDirection } from '../types';
import { LongIcon, ShortIcon, EditIcon, DeleteIcon, DownArrowIcon } from './Icons';
import { analyzeTradeWithGemini } from '../services/geminiService';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: number) => void;
  onUpdateTrade: (trade: Trade) => void;
}

const TradeRow: React.FC<{ trade: Trade; onEdit: (trade: Trade) => void; onDelete: (id: number) => void; onUpdateTrade: (trade: Trade) => void; }> = ({ trade, onEdit, onDelete, onUpdateTrade }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isWin = trade.pnl !== undefined && trade.pnl > 0;
  
  useEffect(() => {
    if (trade.analysis) {
        setAnalysis(trade.analysis);
    }
  }, [trade.analysis]);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError('');
    setAnalysis('');
    try {
      const result = await analyzeTradeWithGemini(trade);
      setAnalysis(result);
      onUpdateTrade({ ...trade, analysis: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price != null && price !== 0) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    }
    return '—';
  };
  
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };


  return (
    <>
      <tr className="group">
        <td className="p-4 w-12 text-center">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-text_secondary hover:text-text_primary rounded-full hover:bg-secondary transition-colors" aria-label={isExpanded ? 'Collapse row' : 'Expand row'}>
                <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <DownArrowIcon />
                </div>
            </button>
        </td>
        <td className="p-4 font-mono text-text_secondary w-16 text-center">{trade.id}</td>
        <td className="p-4 text-sm text-text_secondary">{trade.date.toLocaleDateString()}</td>
        <td className="p-4 font-bold text-text_primary">{trade.asset}</td>
        <td className="p-4">
          <span className={`flex items-center font-bold ${trade.direction === TradeDirection.Long ? 'text-green' : 'text-red'}`}>
            {trade.direction === TradeDirection.Long ? <LongIcon /> : <ShortIcon />}
            <span className="ml-2">{trade.direction}</span>
          </span>
        </td>
        <td className="p-4 font-mono text-text_secondary">{trade.leverage || '—'}</td>
        <td className="p-4 font-mono text-text_secondary">{trade.entryPrice.toLocaleString()}</td>
        <td className="p-4 font-mono text-text_secondary">{trade.exitPrice?.toLocaleString() ?? '—'}</td>
        <td className="p-4 font-mono text-text_secondary">{trade.size.toLocaleString()}</td>
        <td className="p-4 font-mono text-text_secondary">{formatPrice(trade.stopLoss)}</td>
        <td className="p-4 font-mono text-text_secondary">{formatPrice(trade.takeProfit)}</td>
        <td className="p-4 font-bold">
            {trade.status === 'closed' ? (
                <span className={`text-lg font-semibold ${isWin ? 'text-green' : 'text-red'}`}>
                    {trade.pnl!.toFixed(2)}
                </span>
            ) : (
                <span className="text-green bg-green/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    OPEN
                </span>
            )}
        </td>
        <td className="p-4 text-right">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end space-x-1">
                 <button onClick={(e) => handleActionClick(e, () => onEdit(trade))} className="p-2 text-text_secondary hover:text-text_primary hover:bg-secondary rounded-lg transition-colors duration-200" aria-label="Edit trade" title="Edit or Close Trade">
                    <EditIcon />
                </button>
                <button onClick={(e) => handleActionClick(e, () => onDelete(trade.id))} className="p-2 text-text_secondary hover:text-red hover:bg-secondary rounded-lg transition-colors duration-200" aria-label="Delete trade" title="Delete Trade">
                    <DeleteIcon />
                </button>
            </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={13} className="p-0">
            <div className="bg-background p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <div className="bg-surface p-4 rounded-lg">
                  <h4 className="font-bold text-md mb-2 text-teal">Journal</h4>
                  <p className="text-text_secondary whitespace-pre-wrap text-sm leading-relaxed">{trade.journal || 'No journal entry.'}</p>
                </div>
                <div className="bg-surface p-4 rounded-lg border-l-2 border-primary">
                  <h4 className="font-bold text-md mb-2 text-primary">AI Analysis</h4>
                  {analysis && <div className="text-text_secondary whitespace-pre-wrap text-sm leading-relaxed">{analysis}</div>}
                  {error && <div className="text-red bg-red/10 p-2 rounded">{error}</div>}
                  <div className="flex space-x-4 mt-4">
                     <button onClick={handleAnalyze} disabled={isLoading} className="bg-primary hover:bg-primary_hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 text-sm">
                        {isLoading ? 'Analyzing...' : (analysis ? 'Re-Analyze' : 'Analyze with AI')}
                     </button>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};


const TradeList: React.FC<TradeListProps> = ({ trades, onEdit, onDelete, onUpdateTrade }) => {
  if (trades.length === 0) {
    return (
        <div className="text-center py-20 bg-surface rounded-xl">
            <h3 className="text-2xl font-semibold text-text_secondary">No Trades Logged Yet</h3>
            <p className="text-text_tertiary mt-2">Click 'Add Trade' to get started.</p>
        </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b border-border">
            <tr>
              <th className="p-4 w-12"></th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">ID</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Date</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Asset</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Direction</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Leverage</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Entry</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Exit</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Size</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Stop Loss</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">Take Profit</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider">PnL ($)</th>
              <th className="p-4 font-semibold text-text_secondary text-xs uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trades.map(trade => (
              <TradeRow key={trade.id} trade={trade} onEdit={onEdit} onDelete={onDelete} onUpdateTrade={onUpdateTrade} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TradeList;