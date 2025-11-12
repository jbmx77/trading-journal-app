import React, { useRef } from 'react';
import { Trade, TradeDirection, Strategy } from '../types';

interface SyncModalProps {
  onClose: () => void;
  trades: Trade[];
  initialCapital: number;
  onRestore: (file: File) => void;
  strategies: Strategy[];
  activeStrategyId: string | null;
}

const SyncModal: React.FC<SyncModalProps> = ({ onClose, trades, initialCapital, onRestore, strategies, activeStrategyId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportForSheet = () => {
    if (trades.length === 0) {
      alert("No trades to export.");
      return;
    }
    const headers = "Nº\tFecha\tPar\tDirección\tApalancamiento\tEntrada\tSalida\tStop Loss\tTake Profit\tTamaño (ETH)\tJustificación técnica\tNotas adicionales\n";
    const content = trades.map((t, index) => {
      const journalParts = (t.journal || '').split('Notas adicionales:');
      const justificacion = (journalParts[0] || '').replace('Justificación técnica:', '').trim();
      const notas = journalParts[1] || '';
      const formatNumberForSheet = (num: number | undefined) => (num === undefined || num === null || num === 0) ? '' : num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      const row = [
        t.id,
        new Date(t.date).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        t.asset,
        t.direction === TradeDirection.Long ? 'compra' : 'venta',
        t.leverage || '',
        t.entryPrice.toLocaleString('es-ES'),
        t.exitPrice ? t.exitPrice.toLocaleString('es-ES') : '',
        formatNumberForSheet(t.stopLoss),
        formatNumberForSheet(t.takeProfit),
        t.size.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
        justificacion,
        notas.trim(),
      ];
      return row.join('\t');
    }).join('\n');
    const blob = new Blob([headers + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "operaciones_para_importar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCreateBackup = () => {
    const backupData = {
        trades: trades.map(t => ({...t, date: new Date(t.date).toISOString()})),
        initialCapital,
        strategies,
        activeStrategyId,
        timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `trading-journal-backup-${date}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        onRestore(file);
    }
    if (e.target) {
        e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-surface rounded-xl border border-border shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        
        <div className="px-8 pt-6 pb-4 border-b border-border sticky top-0 bg-surface">
          <h2 className="text-2xl font-bold text-text_primary">Sync & Backup</h2>
        </div>

        <div className="flex-grow overflow-y-auto p-8">
          <div className="space-y-8">
            {/* Google Sheet Sync */}
            <div className="text-text_primary space-y-4">
              <h3 className="font-bold text-lg text-teal">Sync with Google Sheet</h3>
              <p className="text-sm text-text_secondary">To update your Google Sheet, export your data and import it there. This keeps your local data private and secure.</p>
              <div className="bg-secondary p-4 rounded-lg text-sm">
                  <p>Click "Export for Sheet", then in Google Sheets go to <code className="bg-background px-1.5 py-0.5 rounded">File &gt; Import</code>, upload the file, and choose "Replace current sheet".</p>
              </div>
              <button onClick={handleExportForSheet} className="bg-primary w-full hover:bg-primary_hover text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200">
                  Export for Sheet
              </button>
            </div>

            {/* Local Backup & Restore */}
            <div>
              <h3 className="font-bold text-lg mb-2 text-teal">Local Backup & Restore</h3>
              <p className="text-text_secondary text-sm mb-4">Save a full backup of your data to a file on your computer, or restore from a previous backup. Restoring will overwrite all current data.</p>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <button onClick={handleCreateBackup} className="bg-green hover:opacity-80 text-white font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 w-full">
                      Create Backup
                  </button>
                  <button onClick={handleRestoreClick} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-4 rounded-lg transition-colors duration-200 w-full">
                      Restore from Backup
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 border-t border-border mt-auto sticky bottom-0 bg-surface">
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary_hover text-text_primary font-bold py-2.5 px-5 rounded-lg transition-colors duration-200">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;