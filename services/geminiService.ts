import { GoogleGenAI, Type } from "@google/genai";
import { Trade, TradeSuggestion, Strategy, TradeDirection } from '../types';

// Use import.meta.env for Vite projects to access environment variables
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.warn("VITE_API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const callGemini = async (prompt: string): Promise<string> => {
    if (!API_KEY) {
      throw new Error("Gemini API key is not configured. Please set the VITE_API_KEY environment variable in your deployment settings.");
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to get a response from AI. The API key might be invalid or the service may be down.");
    }
};

export const getLiveTradeSuggestion = async (
    asset: string,
    strategy: string,
    image5m: string,
    image15m: string,
    image1h: string
): Promise<TradeSuggestion> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }
    
    const imagePart5m = { inlineData: { mimeType: 'image/jpeg', data: image5m } };
    const imagePart15m = { inlineData: { mimeType: 'image/jpeg', data: image15m } };
    const imagePart1h = { inlineData: { mimeType: 'image/jpeg', data: image1h } };

    const textPart = {
        text: `
          You are an expert trading assistant providing precise execution plans. Analyze the provided multi-timeframe charts (1H, 15M, 5M) for ${asset} based on the user's strategy.
          
          Your task is to provide a SINGLE, actionable trade suggestion.
          1.  Determine the Order Type: 'LIMIT' for precise entries, or 'MARKET' for immediate execution.
          2.  For LIMIT orders, provide a specific 'entry' price and a clear 'invalidation' condition (e.g., "Cancel if price breaks below 123.45"). Set minEntry/maxEntry to 0.
          3.  For MARKET orders, provide a valid entry range ('minEntry', 'maxEntry'). The 'entry' price should be 0. The 'invalidation' string should be empty.
          4.  ALWAYS provide a Direction, Stop Loss, Take Profit, and a detailed Rationale.
          5.  If NO valid setup exists, set all numeric fields (entry, stopLoss, takeProfit, minEntry, maxEntry) to 0, set direction to LONG, orderType to MARKET, and explain why in the rationale.

          USER'S TRADING STRATEGY:
          ---
          ${strategy}
          ---

          Respond with ONLY the JSON object.
        `
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart1h, imagePart15m, imagePart5m] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    direction: { type: Type.STRING, enum: ['LONG', 'SHORT'] },
                    orderType: { type: Type.STRING, enum: ['LIMIT', 'MARKET'] },
                    entry: { type: Type.NUMBER, description: 'The specific entry price for a LIMIT order. 0 for MARKET orders.' },
                    minEntry: { type: Type.NUMBER, description: 'The minimum entry price for a MARKET order range. 0 for LIMIT.' },
                    maxEntry: { type: Type.NUMBER, description: 'The maximum entry price for a MARKET order range. 0 for LIMIT.' },
                    stopLoss: { type: Type.NUMBER, description: 'The suggested stop loss price.' },
                    takeProfit: { type: Type.NUMBER, description: 'The suggested take profit price.' },
                    invalidation: { type: Type.STRING, description: 'For LIMIT orders, the condition to cancel the order. Empty for MARKET orders.' },
                    rationale: { type: Type.STRING, description: 'A detailed explanation for the suggestion.' },
                },
                required: ["direction", "orderType", "entry", "minEntry", "maxEntry", "stopLoss", "takeProfit", "invalidation", "rationale"]
            },
        },
    });

    try {
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        // Basic validation for critical fields
        if ((parsedJson.direction !== 'LONG' && parsedJson.direction !== 'SHORT') || (parsedJson.orderType !== 'LIMIT' && parsedJson.orderType !== 'MARKET')) {
            throw new Error(`Invalid enum received from AI: ${parsedJson.direction}, ${parsedJson.orderType}`);
        }
        return parsedJson as TradeSuggestion;
    } catch (error) {
        console.error("Error parsing JSON response from Gemini:", error);
        throw new Error("AI returned an invalid response format.");
    }
};


export const analyzeTradeWithGemini = async (trade: Trade): Promise<string> => {
  const prompt = `
    You are an expert crypto futures trading analyst. Analyze the following trade and provide concise, actionable insights. 
    Focus on potential patterns, mistakes, and successes based on the provided data and journal entry.

    Trade Details:
    - Asset: ${trade.asset}
    - Direction: ${trade.direction}
    - Leverage: ${trade.leverage || 'Not set'}
    - Entry Price: ${trade.entryPrice}
    - Exit Price: ${trade.exitPrice}
    - Stop Loss: ${trade.stopLoss || 'Not set'}
    - Take Profit: ${trade.takeProfit || 'Not set'}
    - Size: ${trade.size}
    - PnL: $${trade.pnl?.toFixed(2)}
    - Date: ${trade.date.toLocaleDateString()}

    Trader's Journal/Notes:
    "${trade.journal || 'No journal entry provided.'}"

    Analysis:
    Provide a brief analysis in 2-3 bullet points.
  `;

  return callGemini(prompt);
};

export const auditTradesWithGemini = async (trades: Trade[], strategy?: Strategy): Promise<string> => {
    const formattedTrades = trades.map(trade => `
---
Trade ID: ${trade.id}
Date: ${trade.date.toISOString().split('T')[0]}
Asset: ${trade.asset}
Direction: ${trade.direction}
Leverage: ${trade.leverage || 'N/A'}
Entry: ${trade.entryPrice}
Exit: ${trade.exitPrice}
PnL: $${trade.pnl?.toFixed(2)}
Journal: "${trade.journal || 'No journal entry.'}"
---
`).join('\n');

    const strategyContext = strategy 
    ? `The trader is operating under the following strategy. Your analysis MUST be in the context of these rules. Identify where the trader deviated from the plan and suggest improvements TO THE STRATEGY ITSELF based on the results.
    
    USER'S STRATEGY: "${strategy.name}"
    ---
    ${strategy.content}
    ---
    `
    : `The trader has not provided a specific strategy. Your analysis should be based on the general principles of the methodology defined below.`;

    const prompt = `
      You are an elite trading advisor specializing in forensic trade analysis. Your methodology is STRICTLY limited to the following:
      - Pure price action analysis across 5M, 15M, and 1H timeframes.
      - The EMA20 is your ONLY technical indicator, used for momentum, bias, and multi-timeframe confluence.
      - Core concepts: Market structure, absorption, imbalance, liquidity voids, liquidity sweeps, and institutional rejection.
      - Timeframe hierarchy: 1H for overall direction, 15M for primary trade execution, and 5M for entry triggers.

      **Objective**: Analyze the following set of trades to identify recurring patterns, both positive and negative. 
      ${strategyContext}
      Your goal is to propose strategic improvements to increase the Win Rate by suggesting ways to cut losses earlier or secure winning trades more effectively. Your suggestions must NOT be so restrictive that they would prevent a trader from taking valid setups in the future.

      **Trades to Analyze**:
      ${formattedTrades}

      **Forensic Audit Report**:
      Based on the provided trades and your specialized methodology, provide a detailed analysis in markdown format. Structure your report with the following sections:
      1.  **### Positive Patterns & Adherence to Strategy**: Identify successful patterns or decisions that align with the strategy and should be repeated.
      2.  **### Negative Patterns & Deviations**: Pinpoint recurring mistakes, deviations from the strategy, or strategic flaws that are costing money.
      3.  **### Actionable Strategic Improvements**: Provide 2-3 concrete, actionable suggestions for improving the strategy itself based on the performance analysis. These should be directly tied to the trader's methodology (e.g., "Consider adding a rule to your strategy: 'Avoid entries if the 1H EMA20 is flat,' as these trades showed a lower success rate.").
    `;

    return callGemini(prompt);
};