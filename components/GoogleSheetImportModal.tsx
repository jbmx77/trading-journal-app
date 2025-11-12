import React, { useState, useMemo } from 'react';
import { getGoogleSheetCsvUrl } from '../utils/googleSheetParser';
import { Trade, TradeDirection } from '../types';

interface GoogleSheetImportModalProps {
  onClose: () => void;
  onImport: (trades: Omit<Trade, 'id'>[]) => void;
}

type MappableFieldKey = keyof Omit<Trade, 'id' | 'pnl' | 'journal' | 'analysis'> | 'justificacion' | 'notas';
type Mapping = { [K in MappableFieldKey]?: string };

const MAPPABLE_FIELDS: { key: MappableFieldKey; label: string; required: boolean }[] = [
    { key: 'date', label: 'Fecha', required: true },
    { key: 'asset', label: 'Par', required: true },
    { key: 'direction', label: 'Dirección', required: true },
    { key: 'leverage', label: 'Apalancamiento', required: false },
    { key: 'entryPrice', label: 'Entrada', required: true },
    { key: 'exitPrice', label: 'Salida', required: true },
    { key: 'size', label: 'Tamaño', required: true },
    { key: 'stopLoss', label: 'Stop Loss', required: false },
    { key: 'takeProfit', label: 'Take Profit', required: false },
    { key: 'justificacion', label: 'Justificación técnica', required: false },
    { key: 'notas', label: 'Notas adicionales', required: false },
];


const GoogleSheetImportModal: React.FC<GoogleSheetImportModalProps> = ({ onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<'input' | 'mapping'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({});

  const isMappingValid = useMemo(() => {
    return MAPPABLE_FIELDS.every(field => {
      if (!field.required) return true;
      return !!mapping[field.key];
    });
  }, [mapping]);

  const autoMapHeaders = (csvHeaders: string[]) => {
    const newMapping: Mapping = {};
    csvHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase().trim();
        if (Object.values(newMapping).includes(header)) return; 
        if (!newMapping.date && lowerHeader.includes('fecha')) newMapping.date = header;
        else if (!newMapping.asset && lowerHeader.includes('par')) newMapping.asset = header;
        else if (!newMapping.direction && lowerHeader.includes('dirección')) newMapping.direction = header;
        else if (!newMapping.leverage && lowerHeader.includes('apalancamiento')) newMapping.leverage = header;
        else if (!newMapping.entryPrice && lowerHeader.includes('entrada')) newMapping.entryPrice = header;
        else if (!newMapping.exitPrice && lowerHeader.includes('salida')) newMapping.exitPrice = header;
        else if (!newMapping.size && lowerHeader.includes('tamaño')) newMapping.size = header;
        else if (!newMapping.stopLoss && lowerHeader.includes('stop loss')) newMapping.stopLoss = header;
        else if (!newMapping.takeProfit && lowerHeader.includes('take profit')) newMapping.takeProfit = header;
        else if (!newMapping.justificacion && lowerHeader.includes('justificación')) newMapping.justificacion = header;
        else if (!newMapping.notas && lowerHeader.includes('notas')) newMapping.notas = header;
    });
    setMapping(newMapping);
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError(null);
    const csvUrl = getGoogleSheetCsvUrl(url);
    if (!csvUrl) {
      setError("Invalid Google Sheet URL. Make sure it's a public sheet and the URL is correct.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Failed to fetch data from the sheet. Please ensure it is public ("Anyone with the link can view").');
      const text = await response.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error("Sheet is empty or has no data rows.");
      
      const parseCsvRow = (line: string): string[] => {
          const result: string[] = [];
          let currentField = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                  if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { currentField += '"'; i++; } 
                  else { inQuotes = !inQuotes; }
              } else if (char === ',' && !inQuotes) {
                  result.push(currentField);
                  currentField = '';
              } else { currentField += char; }
          }
          result.push(currentField);
          return result;
      };

      const parsedHeaders = parseCsvRow(lines[0]).map(h => h.trim());
      const dataRows = lines.slice(1).map(line => parseCsvRow(line));
      
      setHeaders(parsedHeaders);
      setAllRows(dataRows);
      setPreviewRows(dataRows.slice(0, 3));
      autoMapHeaders(parsedHeaders);
      setStep('mapping');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImport = () => {
    const newTrades: Omit<Trade, 'id'>[] = allRows.map((row, index): Omit<Trade, 'id'> | null => {
        try {
            const tradeData: { [K in MappableFieldKey]?: string } = {};
            for (const key in mapping) {
                const castKey = key as MappableFieldKey;
                const headerName = mapping[castKey];
                if (headerName) {
                    const headerIndex = headers.indexOf(headerName);
                    if (headerIndex !== -1) tradeData[castKey] = row[headerIndex];
                }
            }
            const parseNumericValue = (value: string | undefined, fieldName: string, isRequired: boolean = true): number | undefined => {
                if (!value || value.trim() === '') {
                    if (isRequired) throw new Error(`Field '${fieldName}' is empty.`);
                    return undefined;
                }
                let sanitizedValue = value.trim().replace(/[^\d,\.-]/g, '');
                const lastComma = sanitizedValue.lastIndexOf(',');
                const lastPeriod = sanitizedValue.lastIndexOf('.');
                if (lastComma > -1 && lastPeriod > -1) {
                    if (lastComma > lastPeriod) sanitizedValue = sanitizedValue.replace(/\./g, '').replace(',', '.');
                    else sanitizedValue = sanitizedValue.replace(/,/g, '');
                } else if (lastComma > -1) sanitizedValue = sanitizedValue.replace(',', '.');
                const number = parseFloat(sanitizedValue);
                if (isNaN(number)) {
                    if (isRequired) throw new Error(`Field '${fieldName}' ('${value}') is not a valid number.`);
                    return undefined;
                }
                return number;
            };
            if (!tradeData.date || tradeData.date.trim() === '') throw new Error("Date is missing or empty.");
            const dateStr = tradeData.date.trim();
            const parts = dateStr.split(/[\/\-\.]/);
            if (parts.length !== 3) throw new Error(`Invalid date format: '${dateStr}'. Expected DD/MM/YYYY or YYYY-MM-DD.`);
            let [p1, p2, p3] = parts.map(p => parseInt(p, 10));
            let day, month, year;
            if (String(parts[0]).length === 4) { year = p1; month = p2; day = p3; } 
            else { day = p1; month = p2; year = p3; }
            if (year < 100) year = year >= 50 ? 1900 + year : 2000 + year;
            const parsedDate = new Date(Date.UTC(year, month - 1, day));
            if (isNaN(parsedDate.getTime()) || month < 1 || month > 12 || day < 1 || day > 31) throw new Error(`Could not parse date: '${dateStr}'. Check format and values.`);
            const entryPrice = parseNumericValue(tradeData.entryPrice, 'Entrada', true);
            const exitPrice = parseNumericValue(tradeData.exitPrice, 'Salida', true);
            const size = parseNumericValue(tradeData.size, 'Tamaño', true);
            const stopLoss = parseNumericValue(tradeData.stopLoss, 'Stop Loss', false);
            const takeProfit = parseNumericValue(tradeData.takeProfit, 'Take Profit', false);
            if (entryPrice === undefined) throw new Error("Entrada is a required field.");
            if (exitPrice === undefined) throw new Error("Salida is a required field.");
            if (size === undefined) throw new Error("Tamaño is a required field.");
            let direction: TradeDirection;
            const dirString = (tradeData.direction || '').toLowerCase();
            if (dirString.includes('long') || dirString.includes('compra')) direction = TradeDirection.Long;
            else if (dirString.includes('short') || dirString.includes('venta')) direction = TradeDirection.Short;
            else throw new Error(`Invalid direction: '${tradeData.direction}'. Must contain 'compra' or 'venta'.`);
            const pnl = direction === TradeDirection.Long ? (exitPrice - entryPrice) * size : (entryPrice - exitPrice) * size;
            const justificacionText = tradeData.justificacion?.trim();
            const notasText = tradeData.notas?.trim();
            let journal = '';
            if (justificacionText) journal += `Justificación técnica: ${justificacionText}`;
            if (notasText) { if (journal) journal += '\n\n'; journal += `Notas adicionales: ${notasText}`; }
            return { date: parsedDate, asset: String(tradeData.asset || 'N/A'), direction, leverage: String(tradeData.leverage || ''), entryPrice, exitPrice, size, pnl, journal, stopLoss, takeProfit, status: 'closed' };
        } catch (e) {
            console.warn(`Skipping row ${index + 2} due to error:`, e instanceof Error ? e.message : String(e));
            return null;
        }
    }).filter((t): t is Omit<Trade, 'id'> => t !== null);
    onImport(newTrades);
    onClose();
  };

  const handleMappingChange = (field: MappableFieldKey, value: string) => setMapping(prev => ({...prev, [field]: value}));

  const renderContent = () => {
    if (step === 'input') {
      return (
        <>
          <h2 className="text-2xl font-bold mb-4 text-text_primary">Import from Google Sheet</h2>
          <p className="text-text_secondary mb-6">Paste the URL of your public Google Sheet. Make sure sharing is set to "Anyone with the link can view".</p>
          <input 
            type="text" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </>
      );
    }

    if (step === 'mapping') {
      return (
        <>
          <h2 className="text-2xl font-bold mb-4 text-text_primary">Map Columns</h2>
          <p className="text-text_secondary mb-6">Match your sheet's columns to the required trade fields. We've tried to guess for you.</p>
          
          <div className="space-y-3 mb-6">
            {MAPPABLE_FIELDS.map(({key, label, required}) => (
              <div key={key} className="grid grid-cols-2 items-center gap-4">
                <label className="font-semibold text-text_primary">{label}{required && <span className="text-red ml-1">*</span>}</label>
                <select 
                  value={mapping[key] || ''} 
                  onChange={(e) => handleMappingChange(key, e.target.value)}
                  className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <h3 className="font-bold text-lg mb-2 text-text_primary">Data Preview</h3>
          <div className="overflow-x-auto bg-background rounded-md p-2 border border-border">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border">
                  {headers.map(h => <th key={h} className="p-2 font-semibold text-text_secondary">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    {row.map((cell, j) => <td key={j} className="p-2 text-text_secondary truncate max-w-xs">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }
    return null;
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            {renderContent()}
            {isLoading && <div className="text-center text-primary my-4">Loading...</div>}
            {error && <div className="text-red bg-red/10 p-3 rounded-md my-4">{error}</div>}
        </div>
        <div className="flex justify-end space-x-4 pt-6 mt-auto border-t border-border">
          <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
            Cancel
          </button>
          {step === 'input' && (
            <button onClick={handleFetch} disabled={isLoading || !url} className="bg-primary hover:bg-primary_hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
              {isLoading ? 'Fetching...' : 'Fetch Sheet'}
            </button>
          )}
          {step === 'mapping' && (
            <>
              <button onClick={() => setStep('input')} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
                Back
              </button>
              <button onClick={handleImport} disabled={!isMappingValid} className="bg-green hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
                Import {allRows.length} Trades
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetImportModal;