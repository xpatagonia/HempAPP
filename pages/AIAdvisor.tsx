
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, X, Terminal, ArrowRight, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    image?: string;
}

export default function AIAdvisor() {
    const { plots, varieties, locations, trialRecords } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'model',
            text: 'Conexión establecida. Soy HempAI (Core v4.0). He analizado tus datos: ' + plots.length + ' parcelas en red y ' + varieties.length + ' genéticas. ¿En qué decisión técnica puedo asistirte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSelectedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const buildContext = () => {
        const farmSummary = {
            variedades: varieties.map(v => `${v.name} (${v.usage})`),
            parcelas_activas: plots.filter(p => p.status === 'Activa').map(p => {
                const v = varieties.find(v => v.id === p.varietyId);
                const l = locations.find(loc => loc.id === p.locationId);
                return `Lote ${p.name}: Genética ${v?.name}, en ${l?.name}.`;
            }),
            registros: trialRecords.slice(0, 5).map(r => `Fecha ${r.date}: ${r.stage}, Altura ${r.plantHeight}cm.`)
        };
        return JSON.stringify(farmSummary);
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input,
            image: selectedImage || undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setSelectedImage(null);
        setIsLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const parts: any[] = [];
            if (userMsg.text) parts.push({ text: userMsg.text });
            else parts.push({ text: "Analiza esta imagen técnica." });

            if (userMsg.image) {
                const base64Data = userMsg.image.split(',')[1];
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts }],
                config: {
                    systemInstruction: `Eres HempAI, la IA agrónoma experta en Cáñamo Industrial.
                    Contexto operativo del usuario: ${buildContext()}
                    Tu estilo es técnico, directo y basado en ingeniería. No uses introducciones largas.
                    Si te envían una foto, busca plagas, deficiencias o estados fenológicos.`
                }
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text || 'Error en respuesta.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setError(err.message || "Error de comunicación con el núcleo IA.");
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg mr-4">
                        <Bot size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Asistente <span className="text-purple-600">HempAI</span></h1>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center">
                            <Terminal size={10} className="mr-1"/> Industrial Intelligence Engine v4.0
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0a0f1d] rounded-[32px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[70%] rounded-3xl p-5 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-900 dark:bg-hemp-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-2 mb-2 opacity-50 text-[9px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={10}/> : <Bot size={10}/>}
                                    {msg.role === 'user' ? 'Técnico' : 'HempAI Engine'}
                                </div>
                                {msg.image && <img src={msg.image} className="mb-3 rounded-xl max-h-60 w-full object-cover" />}
                                <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl rounded-tl-none p-5 flex items-center space-x-3">
                                <Loader2 className="animate-spin text-hemp-600" size={18} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procesando...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6 bg-white dark:bg-[#0a0f1d] border-t border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <label className="p-4 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-hemp-600 rounded-2xl cursor-pointer transition-all border dark:border-white/5">
                            <ImageIcon size={22} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 outline-none text-sm dark:text-white font-medium"
                            placeholder="Consultar al núcleo de inteligencia..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || (!input && !selectedImage)}
                            className="bg-slate-900 dark:bg-hemp-600 text-white p-4 rounded-2xl hover:shadow-xl transition-all disabled:opacity-30"
                        >
                            <Send size={22} />
                        </button>
                    </div>
                    {selectedImage && (
                        <div className="mt-3 flex items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/40 w-fit">
                            <span className="text-[10px] font-black text-blue-600 uppercase px-2">Imagen Cargada</span>
                            <button onClick={() => setSelectedImage(null)} className="text-red-500"><X size={14}/></button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
