import React, { useState, useRef, useEffect } from 'react';
import { TradeSuggestion, Strategy, Trade } from '../types';
import { getLiveTradeSuggestion } from '../services/geminiService';
import { UploadIcon, CheckIcon, EditIcon, DeleteIcon } from './Icons';
import AcceptSuggestionModal from './AcceptSuggestionModal';

interface LiveTradingProps {
    strategies: Strategy[];
    activeStrategyId: string | null;
    onStrategyChange: (id: string | null) => void;
    onSaveStrategy: (strategy: Strategy) => void;
    onDeleteStrategy: (id: string) => void;
    onOpenTrade: (trade: Omit<Trade, 'id' | 'status'>) => void;
}

const fileToGenerativePart = async (file: File): Promise<string> => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            }
        };
        reader.readAsDataURL(file);
    });
    return await base64EncodedDataPromise;
};

const ImageUploader: React.FC<{
    label: string;
    imageFile: File | null;
    onImageChange: (file: File | null) => void;
}> = ({ label, imageFile, onImageChange }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        onImageChange(file);
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                const file = items[i].getAsFile();
                if (file) {
                    onImageChange(file);
                    break;
                }
            }
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(true);
    };
    
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // This is necessary to allow dropping
        e.stopPropagation();
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0] || null;
        onImageChange(file);
    };

    return (
        <div>
            <label className="block text-sm font-medium text-text_secondary mb-2">{label}</label>
            <div 
                onClick={() => inputRef.current?.click()}
                onPaste={handlePaste}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                tabIndex={0}
                className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-primary
                    ${isDraggingOver ? 'border-primary' : (imageFile ? 'border-green' : 'border-border hover:border-primary')}
                `}
            >
                <input ref={inputRef} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileChange} />
                {imageFile ? (
                    <div className="flex flex-col items-center text-green pointer-events-none">
                        <CheckIcon />
                        <span className="mt-2 text-sm font-semibold truncate">{imageFile.name}</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-text_secondary pointer-events-none">
                        <UploadIcon />
                        <span className="mt-2 text-sm font-semibold">{isDraggingOver ? "Drop Image Here" : "Click, Paste, or Drag Image"}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const SuggestionCard: React.FC<{title: string; value: string | React.ReactNode; colorClass?: string}> = ({ title, value, colorClass = 'text-text_primary' }) => (
    <div className="bg-secondary p-4 rounded-lg">
        <h4 className="text-sm font-bold text-text_secondary uppercase tracking-wider">{title}</h4>
        <div className={`text-2xl font-semibold mt-1 ${colorClass}`}>{value}</div>
    </div>
);


const LiveTrading: React.FC<LiveTradingProps> = ({ strategies, activeStrategyId, onStrategyChange, onSaveStrategy, onDeleteStrategy, onOpenTrade }) => {
    const [asset, setAsset] = useState('');
    const [image5m, setImage5m] = useState<File | null>(null);
    const [image15m, setImage15m] = useState<File | null>(null);
    const [image1h, setImage1h] = useState<File | null>(null);
    
    const [isEditing, setIsEditing] = useState(false);
    const [currentName, setCurrentName] = useState('');
    const [currentContent, setCurrentContent] = useState('');
    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);

    const activeStrategy = strategies.find(s => s.id === activeStrategyId);

    useEffect(() => {
        if (activeStrategy) {
            setCurrentName(activeStrategy.name);
            setCurrentContent(activeStrategy.content);
            setIsEditing(false);
        } else {
            setCurrentName('New Strategy');
            setCurrentContent('');
            setIsEditing(true);
        }
    }, [activeStrategy]);
    
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (id === 'new') {
            onStrategyChange(null);
        } else {
            onStrategyChange(id);
        }
    };
    
    const handleSave = () => {
        if (!currentName.trim() || !currentContent.trim()) {
            alert("Strategy name and content cannot be empty.");
            return;
        }
        const strategyToSave: Strategy = {
            id: activeStrategyId || new Date().toISOString(),
            name: currentName,
            content: currentContent,
        };
        onSaveStrategy(strategyToSave);
        setIsEditing(false);
    };
    
    const [suggestion, setSuggestion] = useState<TradeSuggestion | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const canAnalyze = image5m && image15m && image1h && activeStrategy && asset.trim() !== '';

    const handleAnalyze = async () => {
        if (!canAnalyze) return;
        setIsLoading(true);
        setError('');
        setSuggestion(null);

        try {
            const base64_5m = await fileToGenerativePart(image5m);
            const base64_15m = await fileToGenerativePart(image15m);
            const base64_1h = await fileToGenerativePart(image1h);
            
            const result = await getLiveTradeSuggestion(asset, activeStrategy.content, base64_5m, base64_15m, base64_1h);
            
            const hasValidEntry = result.orderType === 'LIMIT' ? result.entry > 0 : (result.minEntry && result.maxEntry && result.minEntry > 0 && result.maxEntry > 0);

            if (hasValidEntry) {
              setSuggestion(result);
            } else {
              setSuggestion({ ...result, rationale: `No trade setup found aligned with the strategy. Reason: ${result.rationale}` });
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAcceptAndOpen = (trade: Omit<Trade, 'id' | 'status'>) => {
        onOpenTrade(trade);
        setIsAcceptModalOpen(false);
        setSuggestion(null);
        setAsset('');
        setImage1h(null);
        setImage15m(null);
        setImage5m(null);
    };

    const isValidSuggestion = suggestion && (
        (suggestion.orderType === 'LIMIT' && suggestion.entry > 0) ||
        (suggestion.orderType === 'MARKET' && (suggestion.minEntry ?? 0) > 0 && (suggestion.maxEntry ?? 0) > 0)
    );

    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-surface p-6 rounded-xl space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-text_primary">Strategy & Inputs</h2>
                    <p className="text-text_secondary mt-1 text-sm">Select a strategy, provide an asset and charts for an AI-powered trade suggestion.</p>
                </div>

                <div className="bg-secondary p-4 rounded-lg space-y-4">
                     {/* Strategy Management */}
                     <div>
                        <label htmlFor="strategy-select" className="block text-sm font-medium text-text_secondary mb-2">Active Strategy</label>
                        <div className="flex items-center space-x-2">
                           <select
                                id="strategy-select"
                                value={activeStrategyId || 'new'}
                                onChange={handleSelectChange}
                                className="bg-surface p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="new">-- Create New Strategy --</option>
                                {strategies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {activeStrategy && !isEditing && (
                                <>
                                 <button onClick={() => setIsEditing(true)} className="p-2.5 text-text_secondary hover:text-text_primary hover:bg-surface_hover rounded-lg" title="Edit Strategy"><EditIcon/></button>
                                 <button onClick={() => onDeleteStrategy(activeStrategy.id)} className="p-2.5 text-text_secondary hover:text-red hover:bg-surface_hover rounded-lg" title="Delete Strategy"><DeleteIcon/></button>
                                </>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                       <>
                         <input type="text" value={currentName} onChange={(e) => setCurrentName(e.target.value)} placeholder="My EMA20 Pullback Strategy" className="bg-surface font-semibold p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary"/>
                         <textarea value={currentContent} onChange={(e) => setCurrentContent(e.target.value)} placeholder="e.g., - Look for trend continuation on 1H. - Wait for pullback to 15M EMA20..." className="bg-surface p-3 rounded-md w-full h-40 text-sm focus:ring-2 focus:ring-primary focus:outline-none"/>
                        <div className="flex justify-end space-x-2">
                            {activeStrategy && <button onClick={() => setIsEditing(false)} className="bg-secondary_hover text-text_primary font-bold py-2 px-4 rounded-lg">Cancel</button>}
                            <button onClick={handleSave} className="bg-primary hover:bg-primary_hover text-white font-bold py-2 px-4 rounded-lg">Save Strategy</button>
                        </div>
                       </>
                    ) : activeStrategy && (
                         <div className="p-3 bg-surface rounded-md h-48 overflow-y-auto">
                            <div className="prose prose-sm max-w-none text-text_secondary" dangerouslySetInnerHTML={{ __html: activeStrategy.content.replace(/\n/g, '<br/>') }}></div>
                        </div>
                    )}
                </div>
                
                <div>
                    <label htmlFor="asset-input" className="block text-sm font-medium text-text_secondary mb-2">Asset</label>
                    <input id="asset-input" type="text" value={asset} onChange={(e) => setAsset(e.target.value)} placeholder="e.g., BTC/USDT" className="bg-secondary p-2.5 rounded-md w-full border border-transparent focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ImageUploader label="5M Timeframe" imageFile={image5m} onImageChange={setImage5m} />
                    <ImageUploader label="15M Timeframe" imageFile={image15m} onImageChange={setImage15m} />
                    <ImageUploader label="1H Timeframe" imageFile={image1h} onImageChange={setImage1h} />
                </div>
                
                <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze || isLoading}
                    className="w-full mt-4 bg-primary hover:bg-primary_hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                    {isLoading ? 'Analyzing...' : 'Get AI Suggestion'}
                </button>
            </div>
            
            <div className="bg-surface p-6 rounded-xl">
                <h2 className="text-2xl font-bold text-text_primary mb-6">AI Suggestion</h2>
                
                {isLoading && (
                    <div className="flex items-center justify-center h-full text-primary animate-pulse">
                        <p>Analyzing charts based on your strategy...</p>
                    </div>
                )}
                
                {error && (
                    <div className="flex items-center justify-center h-full">
                         <div className="text-red bg-red/10 p-4 rounded-md text-sm">{error}</div>
                    </div>
                )}
                
                {!isLoading && !error && !suggestion && (
                    <div className="flex items-center justify-center h-full text-text_tertiary">
                        <p>Your trade suggestion will appear here.</p>
                    </div>
                )}

                {suggestion && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <SuggestionCard title="Direction" value={suggestion.direction} colorClass={suggestion.direction === 'LONG' ? 'text-green' : 'text-red'}/>
                            <SuggestionCard title="Order Type" value={suggestion.orderType} colorClass="text-teal" />
                        </div>

                        {suggestion.orderType === 'LIMIT' ? (
                            <SuggestionCard 
                                title="Limit Entry & Invalidation" 
                                value={<><span>{suggestion.entry.toLocaleString()}</span><span className="block text-xs text-text_secondary mt-1">{suggestion.invalidation}</span></>}
                            />
                        ) : (
                            <SuggestionCard 
                                title="Market Entry Range"
                                value={`${suggestion.minEntry?.toLocaleString()} - ${suggestion.maxEntry?.toLocaleString()}`}
                            />
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <SuggestionCard title="Stop Loss" value={suggestion.stopLoss.toLocaleString()} />
                             <SuggestionCard title="Take Profit" value={suggestion.takeProfit.toLocaleString()} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-text_secondary uppercase tracking-wider mb-2">Rationale</h4>
                            <div className="bg-secondary p-4 rounded-lg text-text_secondary whitespace-pre-wrap text-sm leading-relaxed max-h-48 overflow-y-auto">
                                {suggestion.rationale}
                            </div>
                        </div>
                         {isValidSuggestion && (
                           <div className="pt-4">
                                <button
                                    onClick={() => setIsAcceptModalOpen(true)}
                                    className="w-full bg-green hover:opacity-80 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                                >
                                    Accept & Open Trade
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        {isAcceptModalOpen && isValidSuggestion && (
            <AcceptSuggestionModal
                isOpen={isAcceptModalOpen}
                onClose={() => setIsAcceptModalOpen(false)}
                onConfirm={handleAcceptAndOpen}
                suggestion={suggestion}
                asset={asset}
            />
        )}
      </>
    );
};

export default LiveTrading;