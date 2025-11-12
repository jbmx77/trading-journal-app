import React, { useState } from 'react';
import { Trade, Audit, Strategy } from '../types';
import { DownArrowIcon } from './Icons';

interface AiAuditProps {
    allTrades: Trade[];
    pastAudits: Audit[];
    onRunAudit: (params: Omit<Audit['parameters'], 'strategyName'>, tradesToAudit: Trade[]) => Promise<void>;
    activeStrategy: Strategy | null;
}

const AiAudit: React.FC<AiAuditProps> = ({ allTrades, pastAudits, onRunAudit, activeStrategy }) => {
    const [selectionType, setSelectionType] = useState<'lastN' | 'dateRange' | 'idRange'>('lastN');
    const [lastN, setLastN] = useState<number>(20);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startId, setStartId] = useState<number>(1);
    const [endId, setEndId] = useState<number>(allTrades.length > 0 ? allTrades[allTrades.length - 1].id : 1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

    const handleRunAudit = async () => {
        setIsLoading(true);
        setError('');
        
        let tradesToAudit: Trade[] = [];
        let params: Omit<Audit['parameters'], 'strategyName'> = { type: selectionType, value: {}, tradeCount: 0 };

        try {
            switch (selectionType) {
                case 'lastN':
                    tradesToAudit = allTrades.slice(-lastN);
                    params.value = { n: lastN };
                    break;
                case 'dateRange':
                    if (!startDate || !endDate) throw new Error("Please select both a start and end date.");
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    tradesToAudit = allTrades.filter(t => t.date >= start && t.date <= end);
                    params.value = { startDate, endDate };
                    break;
                case 'idRange':
                    if (startId > endId) throw new Error("Start ID cannot be greater than End ID.");
                    tradesToAudit = allTrades.filter(t => t.id >= startId && t.id <= endId);
                    params.value = { startId, endId };
                    break;
            }

            if (tradesToAudit.length === 0) {
                throw new Error("No trades found for the selected criteria. Please adjust your selection.");
            }
            if (tradesToAudit.length > 200) {
                throw new Error("Audit is limited to a maximum of 200 trades at a time for performance reasons.");
            }

            params.tradeCount = tradesToAudit.length;
            await onRunAudit(params, tradesToAudit);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const getAuditTitle = (audit: Audit) => {
        const { type, value } = audit.parameters;
        switch(type) {
            case 'lastN': return `Analysis of Last ${value.n} Trades`;
            case 'dateRange': return `Analysis from ${value.startDate} to ${value.endDate}`;
            case 'idRange': return `Analysis of Trades #${value.startId} to #${value.endId}`;
            default: return 'Audit Report';
        }
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-surface p-6 rounded-xl">
                <h2 className="text-2xl font-bold mb-4 text-text_primary">Run New Audit</h2>
                <p className="text-text_secondary mb-6 text-sm">Select a group of trades for the AI to analyze based on your active strategy.</p>
                
                 <div className="mb-6 bg-secondary p-3 rounded-lg">
                    <p className="text-xs text-text_secondary">Active Strategy for Audit:</p>
                    <p className="font-bold text-teal">{activeStrategy ? activeStrategy.name : 'Default Analysis'}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-text_secondary mb-2 block">Analyze by:</label>
                        <select
                            value={selectionType}
                            onChange={(e) => setSelectionType(e.target.value as any)}
                            className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="lastN">Last 'N' Trades</option>
                            <option value="dateRange">Date Range</option>
                            <option value="idRange">ID Range</option>
                        </select>
                    </div>

                    {selectionType === 'lastN' && (
                        <div>
                            <label htmlFor="lastN" className="text-sm font-medium text-text_secondary mb-2 block">Number of Trades</label>
                            <input type="number" id="lastN" value={lastN} onChange={e => setLastN(Math.max(1, parseInt(e.target.value) || 1))} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                    )}
                    {selectionType === 'dateRange' && (
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                                <label htmlFor="startDate" className="text-sm font-medium text-text_secondary mb-2 block">Start Date</label>
                                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" style={{ colorScheme: 'dark' }}/>
                           </div>
                            <div>
                                <label htmlFor="endDate" className="text-sm font-medium text-text_secondary mb-2 block">End Date</label>
                                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" style={{ colorScheme: 'dark' }}/>
                            </div>
                        </div>
                    )}
                    {selectionType === 'idRange' && (
                         <div className="grid grid-cols-2 gap-2">
                           <div>
                                <label htmlFor="startId" className="text-sm font-medium text-text_secondary mb-2 block">Start ID</label>
                                <input type="number" id="startId" value={startId} onChange={e => setStartId(parseInt(e.target.value) || 1)} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" />
                           </div>
                            <div>
                                <label htmlFor="endId" className="text-sm font-medium text-text_secondary mb-2 block">End ID</label>
                                <input type="number" id="endId" value={endId} onChange={e => setEndId(parseInt(e.target.value) || 1)} className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleRunAudit}
                    disabled={isLoading || allTrades.length === 0}
                    className="w-full mt-8 bg-primary hover:bg-primary_hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                    {isLoading ? 'Analyzing...' : 'Run Audit'}
                </button>
                 {allTrades.length === 0 && <p className="text-yellow-400 text-xs text-center mt-2">Add some trades before running an audit.</p>}
                 {error && <div className="text-red bg-red/10 p-3 rounded-md mt-4 text-sm">{error}</div>}
            </div>

            <div className="lg:col-span-2 bg-surface p-6 rounded-xl">
                <h2 className="text-2xl font-bold mb-4 text-text_primary">Audit History</h2>
                {pastAudits.length === 0 && !isLoading && (
                    <div className="text-center py-16 text-text_tertiary">
                        <p>No audits have been run yet.</p>
                        <p className="text-sm">Use the panel on the left to start your first analysis.</p>
                    </div>
                )}
                 {isLoading && pastAudits.length === 0 && (
                    <div className="text-center py-16 text-primary animate-pulse">
                        <p>Generating your first audit report...</p>
                    </div>
                )}
                <div className="space-y-4">
                    {pastAudits.map(audit => (
                        <div key={audit.id} className="bg-secondary rounded-lg">
                           <button 
                                onClick={() => setExpandedAuditId(expandedAuditId === audit.id ? null : audit.id)}
                                className="w-full text-left p-4 flex justify-between items-center hover:bg-surface_hover transition-colors rounded-lg"
                            >
                                <div>
                                    <p className="font-bold text-teal">{getAuditTitle(audit)}</p>
                                    <p className="text-xs text-text_secondary">
                                        {new Date(audit.date).toLocaleString()} &bull; {audit.parameters.tradeCount} trades analyzed with '{audit.parameters.strategyName}'
                                    </p>
                                </div>
                                <span className={`transform transition-transform text-text_secondary ${expandedAuditId === audit.id ? 'rotate-180' : ''}`}>
                                    <DownArrowIcon />
                                </span>
                           </button>
                           {expandedAuditId === audit.id && (
                                <div className="p-6 border-t border-border">
                                    <div className="prose prose-sm max-w-none text-text_secondary prose-h3:text-text_primary prose-h3:font-bold" dangerouslySetInnerHTML={{ __html: audit.result.replace(/### (.*?)\n/g, '<h3>$1</h3>').replace(/\n/g, '<br />') }}></div>
                                </div>
                           )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AiAudit;