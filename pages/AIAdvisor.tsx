
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
// Fix: Added missing import for RefreshCw component
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
            text: 'Hola. Soy HempAI (v4.0). He analizado tus datos actuales: tienes ' + plots.length + ' parcelas registradas y ' + varieties.length + ' variedades en catálogo. ¿En qué decisión técnica puedo asistirte hoy?'
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
            locaciones: locations.map(l => `${l.name} (${l.province})`),
            parcelas_activas: plots.filter(p => p.status === 'Activa').map(p => {
                const v = varieties.find(v => v.id === p.varietyId);
                const l = locations.find(loc => loc.id === p.locationId);
                return `Lote ${p.name}: Genética ${v?.name}, en ${l?.name}. Sembrado: ${p.sowingDate}.`;
            }),
            registros: trialRecords.slice(0, 10).map(r => `Registro ${r.date}: ${r.stage}, Altura ${r.plantHeight}cm.`)
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
            else if (userMsg.image) parts.push({ text: "Analiza esta imagen técnica de campo." });

            if (userMsg.image) {
                const base64Data = userMsg.image.split(',')[1] || userMsg.image;
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts }],
                config: {
                    systemInstruction: `Eres HempAI, el núcleo de inteligencia agrónoma de HempC. 
                    Eres experto en Cannabis Sativa L. (Cáñamo Industrial).
                    Tu objetivo: decisiones basadas en datos.
                    
                    CONTEXTO INDUSTRIAL DEL USUARIO:
                    ${buildContext()}
                    
                    NORMAS:
                    1. Respuestas de grado ingeniería: precisas, basadas en evidencia.
                    2. Si detectas plagas en fotos, identifica el patógeno y sugiere manejo.
                    3. Sé breve. Usa terminología técnica (fenología, grados día, lixiviación, etc).`
                }
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text || 'Sin respuesta del núcleo.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setError(err.message || "Fallo en conexión neural.");
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg shadow-purple-900/20 mr-4">
                        <Bot size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Asistente <span className="text-purple-600">HempAI</span></h1>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] flex items-center">
                            <Terminal size={10} className="mr-1"/> Industrial Neural Network v4.0
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0a0f1d] rounded-[32px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col relative">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 dark:bg-transparent">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-3xl p-5 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-900 dark:bg-hemp-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-2 mb-2 opacity-50 text-[9px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={10}/> : <Bot size={10}/>}
                                    {msg.role === 'user' ? 'Terminal' : 'HempAI Engine'}
                                </div>
                                
                                {msg.image && (
                                    <div className="mb-4 rounded-2xl overflow-hidden border border-white/10">
                                        <img src={msg.image} alt="Technical" className="max-h-64 w-full object-cover" />
                                    </div>
                                )}
                                
                                <div className="text-sm leading-relaxed font-medium whitespace-pre-wrap">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl rounded-tl-none p-5 flex items-center space-x-3">
                                <Loader2 className="animate-spin text-hemp-600" size={18} />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Procesando datos técnicos...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6 bg-white dark:bg-[#0a0f1d] border-t border-slate-100 dark:border-white/5">
                    {selectedImage && (
                        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-3 rounded-2xl mb-4 w-fit animate-in slide-in-from-bottom-2">
                            <ImageIcon size={16} className="text-slate-500 mr-2" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-4">Imagen para análisis</span>
                            <button onClick={() => setSelectedImage(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950 p-1 rounded-full transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <label className="p-4 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-hemp-600 dark:hover:text-hemp-500 rounded-2xl cursor-pointer transition-all border border-slate-100 dark:border-white/5">
                            <ImageIcon size={22} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isLoading} />
                        </label>
                        
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-hemp-500/30 outline-none text-sm dark:text-white placeholder-slate-400 transition-all font-medium"
                            placeholder="Ingrese comando técnico o consulta de campo..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                        />
                        
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || (!input && !selectedImage)}
                            className="bg-slate-900 dark:bg-hemp-600 text-white p-4 rounded-2xl hover:shadow-xl transition-all disabled:opacity-30 flex items-center justify-center group"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </button>
                    </div>
                </div>
            </div>
            
            {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center">
                    <AlertTriangle className="mr-3" size={16}/> {error}
                </div>
            )}
        </div>
    );
}
