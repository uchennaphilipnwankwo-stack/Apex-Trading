import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bot, Send, X, Shield, Activity, AlertTriangle } from 'lucide-react';

interface TradeIntent {
    action: 'buy' | 'sell';
    amountInSol: number;
    confidence: number;
}

interface ChatMessage {
    role: 'user' | 'ai' | 'system';
    content: string;
    isExecuting?: boolean;
}

const useAITradingAgent = (executeSwap: (amount: number, isBuying: boolean) => Promise<boolean>) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { role: 'ai', content: 'APEX Agent online. I can route trades via Jupiter. What would you like to do?' }
    ]);
    const [isProcessing, setIsProcessing] = useState(false);

    const parseIntentWithLLM = async (userText: string): Promise<TradeIntent | null> => {
        const text = userText.toLowerCase();
        let action: 'buy' | 'sell' | null = null;
        if (text.includes('buy')) action = 'buy';
        if (text.includes('sell')) action = 'sell';
        const amountMatch = text.match(/[\d]*\.?[\d]+/);
        const amountInSol = amountMatch ? parseFloat(amountMatch[0]) : null;
        if (action && amountInSol) {
            return { action, amountInSol, confidence: 0.98 };
        }
        return null;
    };

    const sendMessage = async (message: string) => {
        if (!message.trim() || isProcessing) return;
        setChatHistory(prev => [...prev, { role: 'user', content: message }]);
        setIsProcessing(true);
        try {
            const intent = await parseIntentWithLLM(message);
            if (!intent || intent.confidence < 0.8) {
                setChatHistory(prev => [...prev, { role: 'ai', content: "I didn't quite catch the specifics. Please specify if you want to 'buy' or 'sell' and the amount of SOL." }]);
                return;
            }
            setChatHistory(prev => [...prev, { role: 'system', content: `Preparing Jupiter route to ${intent.action.toUpperCase()} ${intent.amountInSol} SOL... Check your wallet to sign.`, isExecuting: true }]);
            const isBuying = intent.action === 'buy';
            const success = await executeSwap(intent.amountInSol, isBuying);
            if (success) {
                setChatHistory(prev => [...prev, { role: 'ai', content: `Success! Successfully routed and executed the ${intent.action} order via Jupiter V6.` }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'ai', content: `The transaction was cancelled or failed on-chain.` }]);
            }
        } catch (error) {
            setChatHistory(prev => [...prev, { role: 'ai', content: "An error occurred while connecting to the routing engine." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return { chatHistory, sendMessage, isProcessing };
};

export function AIChatModal({ isOpen, onClose, executeSwap }: { isOpen: boolean, onClose: () => void, executeSwap: any }) {
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const { connected } = useWallet();
    const { chatHistory, sendMessage, isProcessing } = useAITradingAgent(executeSwap);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const handleSend = () => {
        sendMessage(inputText);
        setInputText('');
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col h-[600px]">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/10 rounded-xl">
                            <Bot className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">APEX Execution Agent</p>
                            <p className="text-xs text-emerald-400 flex items-center gap-1">
                                <Shield className="w-3 h-3" /> Jupiter V6 Linked
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-900/50">
                    {!connected && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            <p className="text-xs text-amber-300">Wallet disconnected. I cannot execute trades until you connect.</p>
                        </div>
                    )}
                    {chatHistory.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}> 
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${m.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm' : m.role === 'system' ? 'bg-slate-800 border border-violet-500/30 text-violet-200' : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700'} `}> 
                                {m.isExecuting && <Activity className="w-4 h-4 inline mr-2 animate-pulse text-violet-400" />} 
                                {m.content} 
                            </div> 
                        </div> 
                    ))}
                    {isProcessing && (
                        <div className="flex justify-start"> 
                            <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-slate-800 border border-slate-700 text-slate-400"> 
                                <span className="animate-pulse">Parsing intent...</span> 
                            </div> 
                        </div> 
                    )}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-950">
                    <div className="flex gap-2">
                        <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} disabled={isProcessing || !connected} placeholder={connected ? "e.g., Sell 0.5 SOL for USDC" : "Connect wallet to chat..."} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 text-white disabled:opacity-50" />
                        <button onClick={handleSend} disabled={isProcessing || !inputText.trim() || !connected} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 px-5 rounded-xl transition-colors flex items-center justify-center">
                            <Send className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}