import React, { useState, useEffect, useMemo } from 'react';
import { Trade, TradeDirection } from '../types';

interface TradeModalProps {
  onClose: () => void;
  onOpenTrade: (trade: Omit<Trade, 'id' | 'status'>) => void;
  onAddCompleteTrade: (trade: Omit<Trade, 'id' | 'status'>) => void;
  onUpdateTrade: (trade: Trade) => void;
  existingTrade: Trade | null;
  uniqueAssets: string[];
  uniqueLeverages: string[];
  onPromptConfirmation: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmButtonText: string;
    confirmButtonClassName?: string;
  }) => void;
}

const formatForInput = (value: number | undefined | null): string => {
    return value === undefined || value === null ? '' : String(value);
};

const FormInput = ({ id, label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string, error?: string }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text_secondary mb-1">{label}</label>
        <input id={id} {...props} className={`bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${error ? 'border-red' : 'focus:border-primary'}`} />
        {error && <p className="text-red text-xs mt-1">{error}</p>}
    </div>
);

const TradeModal: React.FC<TradeModalProps> = ({ 
    onClose, 
    onOpenTrade,
    onAddCompleteTrade,
    onUpdateTrade, 
    existingTrade, 
    uniqueAssets, 
    uniqueLeverages,
    onPromptConfirmation
}) => {
  const isOpening = !existingTrade;
  const isEditingOpenTrade = existingTrade?.status === 'open';
  const isEditingClosedTrade = existingTrade?.status === 'closed';

  const [formData, setFormData] = useState({
    date: existingTrade ? existingTrade.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    asset: existingTrade?.asset || '',
    direction: existingTrade?.direction || TradeDirection.Long,
    leverage: existingTrade?.leverage || '',
    entryPrice: formatForInput(existingTrade?.entryPrice),
    exitPrice: formatForInput(existingTrade?.exitPrice),
    size: formatForInput(existingTrade?.size),
    journal: existingTrade?.journal || '',
    stopLoss: formatForInput(existingTrade?.stopLoss),
    takeProfit: formatForInput(existingTrade?.takeProfit),
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isExitRequiredAfterPaste, setIsExitRequiredAfterPaste] = useState(false);
  const [pnl, setPnl] = useState<number | null>(existingTrade?.pnl || null);
  const [pasteData, setPasteData] = useState('');
  
  const getModalTitle = () => {
    if (isOpening) return 'Add New Trade';
    if (isEditingOpenTrade) return `Edit Open Trade #${existingTrade?.id}`;
    return `Edit Trade #${existingTrade?.id}`;
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.asset.trim()) newErrors.asset = "Asset is required.";
    if (!formData.date) newErrors.date = "Date is required.";
    
    const entryPrice = parseFloat(formData.entryPrice);
    if (isNaN(entryPrice) || entryPrice <= 0) newErrors.entryPrice = "Entry Price must be a positive number.";
    
    const size = parseFloat(formData.size);
    if (isNaN(size) || size <= 0) newErrors.size = "Size must be a positive number.";

    const isExitPricePotentiallyRequired = isEditingClosedTrade || isExitRequiredAfterPaste;
    const exitPriceValue = formData.exitPrice.trim();

    if (isExitPricePotentiallyRequired && !exitPriceValue) {
        newErrors.exitPrice = isExitRequiredAfterPaste 
            ? "Exit Price is required to save as a closed trade."
            : "Exit Price is required for a closed trade.";
    } else if (exitPriceValue) {
        const exitPrice = parseFloat(exitPriceValue);
        if (isNaN(exitPrice) || exitPrice <= 0) {
            newErrors.exitPrice = "If provided, Exit Price must be a positive number.";
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const hasValidExitPrice = useMemo(() => {
    const exitPrice = parseFloat(formData.exitPrice);
    return !isNaN(exitPrice) && exitPrice > 0;
  }, [formData.exitPrice]);

  const getSubmitButtonText = () => {
    if (isOpening) {
        return hasValidExitPrice ? 'Add Closed Trade' : 'Open Trade';
    }
    if (isEditingOpenTrade) {
        return hasValidExitPrice ? 'Save & Close Trade' : 'Save Changes';
    }
    return 'Save Changes';
  };

  useEffect(() => {
    const entry = parseFloat(formData.entryPrice);
    const exit = parseFloat(formData.exitPrice);
    const size = parseFloat(formData.size);

    if (entry > 0 && exit > 0 && size > 0) {
      let calculatedPnl = 0;
      if (formData.direction === TradeDirection.Long) {
        calculatedPnl = (exit - entry) * size;
      } else {
        calculatedPnl = (entry - exit) * size;
      }
      setPnl(calculatedPnl);
    } else {
      setPnl(null);
    }
  }, [formData.entryPrice, formData.exitPrice, formData.size, formData.direction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    }
  };
  
  const parsePastedData = (text: string) => {
    const sanitizedText = text.replace(/(?<=\d),(?=\d{3})/g, '');
    const parts = sanitizedText.split(',');
    if (parts.length < 8) return null;
    const structuredParts = parts.slice(0, 9).map(p => p.trim());
    const journal = parts.length > 9 ? parts.slice(9).join(',').trim() : '';
    const [dateStr, asset, directionStr, leverage, entryPriceStr, exitPriceStr, stopLossStr, takeProfitStr, sizeStr] = structuredParts;
    const parseNumericValue = (value: string | undefined): number | undefined => {
      if (!value || value.trim() === '') return undefined;
      const sanitizedValue = value.trim().replace(/[$,]/g, '');
      const number = parseFloat(sanitizedValue);
      return isNaN(number) ? undefined : number;
    };
    try {
        const date = new Date(dateStr).toISOString().split('T')[0];
        const direction = (directionStr || '').toLowerCase().includes('long') ? TradeDirection.Long : TradeDirection.Short;
        return { date, asset: asset || '', direction, leverage: leverage || '', entryPrice: parseNumericValue(entryPriceStr), exitPrice: parseNumericValue(exitPriceStr), stopLoss: parseNumericValue(stopLossStr), takeProfit: parseNumericValue(takeProfitStr), size: parseNumericValue(sizeStr), journal };
    } catch { return null; }
  };

  const handlePasteDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteData(text);
    const data = parsePastedData(text);
    if (!data) return;

    const fillForm = (tradeData: typeof data) => {
        setFormData({
            date: tradeData.date || '',
            asset: tradeData.asset || '',
            direction: tradeData.direction,
            leverage: tradeData.leverage || '',
            entryPrice: formatForInput(tradeData.entryPrice),
            exitPrice: formatForInput(tradeData.exitPrice),
            size: formatForInput(tradeData.size),
            journal: tradeData.journal || '',
            stopLoss: formatForInput(tradeData.stopLoss),
            takeProfit: formatForInput(tradeData.takeProfit),
        });
    };
    
    if (data.exitPrice && data.exitPrice > 0) {
        fillForm(data);
    } else {
        onPromptConfirmation({
            title: 'Confirm Open Trade',
            message: 'Exit Price is missing or zero. Is this an open trade?',
            onConfirm: () => {
              const { exitPrice, ...openTradeData } = data;
              onOpenTrade({ ...openTradeData, date: new Date(data.date), size: data.size || 0, entryPrice: data.entryPrice || 0 });
              onClose();
            },
            onCancel: () => {
              fillForm(data);
              setIsExitRequiredAfterPaste(true);
            },
            confirmButtonText: 'Yes, Save Open Trade',
            confirmButtonClassName: 'bg-green hover:opacity-80',
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const parsedData = {
        date: new Date(formData.date), asset: formData.asset, direction: formData.direction, leverage: formData.leverage, entryPrice: parseFloat(formData.entryPrice), size: parseFloat(formData.size), journal: formData.journal, stopLoss: parseFloat(formData.stopLoss) || undefined, takeProfit: parseFloat(formData.takeProfit) || undefined, exitPrice: parseFloat(formData.exitPrice) || undefined,
    };
    if (isOpening) {
        if (parsedData.exitPrice && parsedData.exitPrice > 0) onAddCompleteTrade(parsedData);
        else { const { exitPrice, ...openTradeData } = parsedData; onOpenTrade(openTradeData); }
    } 
    else if (existingTrade) {
        const isNowClosed = !!(parsedData.exitPrice && parsedData.exitPrice > 0);
        const newStatus = isNowClosed ? 'closed' : 'open';

        let finalPnl: number | undefined = undefined;
        if (isNowClosed) {
            finalPnl = pnl !== null ? pnl : undefined;
        }
        
        const updatedTrade: Trade = { 
          ...existingTrade, 
          ...parsedData, 
          pnl: finalPnl, 
          status: newStatus 
        };
        onUpdateTrade(updatedTrade);
    }
    onClose();
  };
  
  const allLeverages = [...new Set(['1x', '5x', '10x', '20x', '25x', '50x', '100x', ...uniqueLeverages])];
  const isSubmitDisabled = Object.keys(errors).length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-2xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-text_primary">{getModalTitle()}</h2>

        {isOpening && (
            <>
                <div className="mb-4">
                    <label htmlFor="paste-area" className="block text-sm font-medium text-text_secondary mb-2">
                        <strong>Quick Add:</strong> Paste comma-separated values.
                    </label>
                    <textarea
                        id="paste-area"
                        value={pasteData}
                        onChange={handlePasteDataChange}
                        placeholder="Date,Asset,Direction,Leverage,Entry,Exit,SL,TP,Size,Journal..."
                        className="bg-secondary border border-transparent p-2.5 rounded-md w-full h-24 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                </div>
                <div className="relative flex items-center my-6">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink mx-4 text-text_tertiary text-xs uppercase tracking-wider">Or Fill Manually</span>
                    <div className="flex-grow border-t border-border"></div>
                </div>
            </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput id="trade-date" label="Date" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <div>
              <label htmlFor="trade-asset" className="block text-sm font-medium text-text_secondary mb-1">Asset</label>
              <input id="trade-asset" type="text" list="asset-list" name="asset" placeholder="e.g., BTC/USDT" value={formData.asset} onChange={handleChange} className={`bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${errors.asset ? 'border-red' : 'focus:border-primary'}`} required />
              <datalist id="asset-list">{uniqueAssets.map(asset => <option key={asset} value={asset} />)}</datalist>
              {errors.asset && <p className="text-red text-xs mt-1">{errors.asset}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trade-direction" className="block text-sm font-medium text-text_secondary mb-1">Direction</label>
              <select id="trade-direction" name="direction" value={formData.direction} onChange={handleChange} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50">
                <option value={TradeDirection.Long}>Long</option>
                <option value={TradeDirection.Short}>Short</option>
              </select>
            </div>
             <div>
              <label htmlFor="trade-leverage" className="block text-sm font-medium text-text_secondary mb-1">Leverage</label>
              <input id="trade-leverage" type="text" list="leverage-list" name="leverage" placeholder="e.g., 10x" value={formData.leverage} onChange={handleChange} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" />
              <datalist id="leverage-list">{allLeverages.map(lev => <option key={lev} value={lev} />)}</datalist>
            </div>
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <FormInput id="trade-entry" label="Entry Price" type="text" name="entryPrice" placeholder="0.00" value={formData.entryPrice} onChange={handleChange} required error={errors.entryPrice}/>
            <div>
                <label htmlFor="trade-exit" className={`block text-sm font-medium mb-1 ${isExitRequiredAfterPaste ? 'text-yellow-400' : 'text-text_secondary'}`}>Exit Price</label>
                <input id="trade-exit" type="text" name="exitPrice" placeholder="0.00" value={formData.exitPrice} onChange={handleChange} className={`bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary ${isExitRequiredAfterPaste ? 'ring-2 ring-yellow-500' : ''} ${errors.exitPrice ? 'border-red' : ''}`} />
                 {errors.exitPrice && <p className="text-red text-xs mt-1">{errors.exitPrice}</p>}
            </div>
            <FormInput id="trade-size" label="Size" type="text" name="size" placeholder="0.00" value={formData.size} onChange={handleChange} required error={errors.size}/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormInput id="trade-sl" label="Stop Loss" type="text" name="stopLoss" placeholder="0.00 (optional)" value={formData.stopLoss} onChange={handleChange} />
             <FormInput id="trade-tp" label="Take Profit" type="text" name="takeProfit" placeholder="0.00 (optional)" value={formData.takeProfit} onChange={handleChange} />
          </div>
          
          {pnl !== null && (
            <div className="bg-secondary p-3 rounded-md">
              <p className="text-text_secondary">Calculated PnL: <span className={`font-bold ${pnl >= 0 ? 'text-green' : 'text-red'}`}>${pnl.toFixed(2)}</span></p>
            </div>
          )}

          <div>
            <label htmlFor="trade-journal" className="block text-sm font-medium text-text_secondary mb-1">Journal</label>
            <textarea id="trade-journal" name="journal" placeholder={isEditingOpenTrade ? 'Notes about trade management, observations...' : 'Journal entry, thoughts, strategy...'} value={formData.journal} onChange={handleChange} className="bg-secondary p-2.5 rounded-md w-full h-24 border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitDisabled} className="bg-primary hover:bg-primary_hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
              {getSubmitButtonText()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeModal;