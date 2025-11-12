import React, { useState, useEffect } from 'react';
import { Trade, TradeSuggestion, TradeDirection } from '../types';

interface AcceptSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trade: Omit<Trade, 'id' | 'status'>) => void;
  suggestion: TradeSuggestion;
  asset: string;
}

const FormInput = ({ id, label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text_secondary mb-1">{label}</label>
        <input id={id} {...props} className={`bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-red' : 'focus:border-primary'}`} />
        {error && <p className="text-red text-xs mt-1">{error}</p>}
    </div>
);

const AcceptSuggestionModal: React.FC<AcceptSuggestionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suggestion,
  asset,
}) => {
  const getInitialEntry = () => {
    if (suggestion.orderType === 'LIMIT') return String(suggestion.entry);
    if (suggestion.minEntry && suggestion.maxEntry) {
      return String((suggestion.minEntry + suggestion.maxEntry) / 2);
    }
    return '';
  };

  const [actualEntry, setActualEntry] = useState<string>(getInitialEntry());
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [recalculatedSL, setRecalculatedSL] = useState<number>(suggestion.stopLoss);
  const [recalculatedTP, setRecalculatedTP] = useState<number>(suggestion.takeProfit);

  useEffect(() => {
    const entryNum = parseFloat(actualEntry);
    if (isNaN(entryNum) || entryNum <= 0) return;

    // Anchor the SL/TP distance to the original suggested entry price for consistency
    const originalEntry = suggestion.orderType === 'LIMIT' ? suggestion.entry : (suggestion.minEntry! + suggestion.maxEntry!) / 2;

    if (suggestion.direction === TradeDirection.Long) {
      const slDistance = originalEntry - suggestion.stopLoss;
      const tpDistance = suggestion.takeProfit - originalEntry;
      setRecalculatedSL(entryNum - slDistance);
      setRecalculatedTP(entryNum + tpDistance);
    } else { // SHORT
      const slDistance = suggestion.stopLoss - originalEntry;
      const tpDistance = originalEntry - suggestion.takeProfit;
      setRecalculatedSL(entryNum + slDistance);
      setRecalculatedTP(entryNum - tpDistance);
    }
  }, [actualEntry, suggestion]);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!size.trim() || parseFloat(size) <= 0) newErrors.size = "Size must be a positive number.";
    if (!leverage.trim()) newErrors.leverage = "Leverage is required.";
    const entry = parseFloat(actualEntry);
    if (isNaN(entry) || entry <= 0) newErrors.actualEntry = "Entry Price must be a positive number.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validate()) return;
    
    const tradeToOpen: Omit<Trade, 'id' | 'status'> = {
      date: new Date(),
      asset,
      direction: suggestion.direction,
      entryPrice: parseFloat(actualEntry),
      size: parseFloat(size),
      leverage,
      stopLoss: recalculatedSL,
      takeProfit: recalculatedTP,
      journal: `Trade opened based on AI Suggestion (${suggestion.orderType} order).\n\nRationale:\n${suggestion.rationale}`,
    };
    
    onConfirm(tradeToOpen);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-2xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2 text-text_primary">Confirm & Open Trade</h2>
        <p className="text-text_secondary mb-6">Review the AI suggestion and enter your trade details.</p>
        
        <div className="space-y-4">
          <div className="bg-secondary p-3 rounded-lg text-sm">
            <p><span className="font-bold text-text_secondary">Order Type:</span> <span className="font-semibold text-teal">{suggestion.orderType}</span></p>
            {suggestion.orderType === 'LIMIT' && <p><span className="font-bold text-text_secondary">Invalidation:</span> <span className="font-semibold text-text_primary">{suggestion.invalidation}</span></p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              id="actual-entry"
              label="Actual Entry Price"
              value={actualEntry}
              onChange={(e) => setActualEntry(e.target.value)}
              error={errors.actualEntry}
              required
            />
             <FormInput
              id="trade-size"
              label="Size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="0.00"
              error={errors.size}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput
              id="trade-leverage"
              label="Leverage"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              placeholder="e.g., 20x"
              error={errors.leverage}
              required
            />
            {/* Display-only recalculated values */}
            <div>
                <label className="block text-sm font-medium text-text_secondary mb-1">Recalculated SL / TP</label>
                <div className="bg-secondary p-2.5 rounded-md w-full text-text_primary">
                    {recalculatedSL.toFixed(4)} / {recalculatedTP.toFixed(4)}
                </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-text_secondary uppercase tracking-wider mb-2">AI Rationale</h4>
            <div className="bg-secondary p-3 rounded-lg text-text_secondary text-sm max-h-24 overflow-y-auto">
                {suggestion.rationale}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6 mt-4">
          <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            className="bg-green hover:opacity-80 disabled:opacity-50 text-white font-bold py-2.5 px-5 rounded-lg transition-colors duration-200"
            disabled={!size || !leverage || !!errors.size || !!errors.leverage || !!errors.actualEntry}
          >
            Confirm & Open Trade
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptSuggestionModal;