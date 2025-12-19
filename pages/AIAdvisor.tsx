
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, X, Terminal, RefreshCw, Cpu, Activity } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message { id: string; role: 'user' | 'model'; text: string; image?: string; }

export default function AIAdvisor() {
    const { plots, varieties, locations } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `HempAI Core v5.0 ONLINE.\nSistemas en red: ${plots.length} parcelas, ${varieties.length} genéticas.\nListo para procesamiento de datos agrónomos.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSelectedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, image: selectedImage || undefined };
        setMessages(prev => [...prev, userMsg]);
        setInput(''); setSelectedImage(null); setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const parts: any[] = [];
            if (userMsg.text) parts.push({ text: userMsg.text });
            else if (userMsg.image) parts.push({ text: "Analiza el estado fenológico en esta captura." });
            if (userMsg.image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: userMsg.image.split(',')[1] } });

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts }],
                config: { systemInstruction: "Eres HempAI v5.0. Eres un experto en Cáñamo Industrial. Respuestas técnicas, breves y en Español." }
            });

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response.text || 'Sin respuesta.' }]);
        } catch (err) { console.error(err); } finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-1000">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                    <div className="bg-hemp-600 p-4 rounded-[24px] text-white shadow-[0_0_40px_rgba(22,163,74,0.3)]"><Cpu size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">HempAI <span className="text-hemp-500">Core</span></h1>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.4em] flex items-center mt-1">
                            <Terminal size={12} className="mr-2"/> Industrial Intelligence Terminal v5.0.1
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-[#050810] rounded-[48px] border border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-[32px] p-8 shadow-sm ${msg.role === 'user' ? 'bg-hemp-600 text-white rounded-tr-none' : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                                <div className="flex items-center gap-2 mb-4 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>} {msg.role === 'user' ? 'Technician' : 'HempAI Engine'}
                                </div>
                                {msg.image && <img src={msg.image} className="mb-4 rounded-2xl max-h-64 w-full object-cover border border-white/10" />}
                                <div className="text-base leading-relaxed font-medium whitespace-pre-wrap font-mono">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/5 rounded-[32px] p-8 flex items-center space-x-4">
                                <RefreshCw className="animate-spin text-hemp-500" size={24} />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Processing Neural Request...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-10 bg-black/40 border-t border-white/5">
                    {selectedImage && (
                        <div className="flex items-center bg-hemp-500/10 p-4 rounded-2xl mb-6 border border-hemp-500/20 w-fit">
                            <ImageIcon size={20} className="text-hemp-500 mr-3" />
                            <span className="text-[10px] font-black text-hemp-500 uppercase tracking-widest mr-4">Captura Cargada</span>
                            <button onClick={() => setSelectedImage(null)} className="text-red-400"><X size={18} /></button>
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <label className="p-5 bg-white/5 text-slate-500 hover:text-hemp-500 rounded-[24px] cursor-pointer transition-all border border-white/5 shadow-inner">
                            <ImageIcon size={28} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <input 
                            type="text" className="flex-1 bg-white/5 border border-white/5 rounded-[24px] px-8 py-5 focus:ring-4 focus:ring-hemp-600/20 outline-none text-base text-white placeholder-slate-600 font-mono"
                            placeholder="Comandos agrónomos..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} disabled={isLoading} className="bg-hemp-600 text-white p-5 rounded-[24px] shadow-[0_10px_30px_rgba(22,163,74,0.3)] disabled:opacity-30 active:scale-90 transition-all">
                            <Send size={28} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
