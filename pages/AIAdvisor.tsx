
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, X, Terminal, ArrowRight, RefreshCw, Cpu, Database } from 'lucide-react';
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
            text: `Enlace establecido. Soy HempAI v4.0. 
            
Sistemas Sincronizados:
- Parcelas activas detectadas: ${plots.length}
- Germoplasma registrado: ${varieties.length} variedades
- Nodos geográficos: ${locations.length} establecimientos

¿Qué consulta técnica desea realizar sobre la red de siembra?`
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
            variedades: varieties.map(v => `${v.name} (Uso: ${v.usage})`),
            establecimientos: locations.map(l => `${l.name} (${l.province})`),
            parcelas: plots.filter(p => p.status === 'Activa').map(p => {
                const v = varieties.find(v => v.id === p.varietyId);
                const l = locations.find(loc => loc.id === p.locationId);
                return `Lote ${p.name}: Genética ${v?.name}, en establecimiento ${l?.name}.`;
            }),
            telemetria_reciente: trialRecords.slice(0, 10).map(r => `Fecha ${r.date}: Etapa ${r.stage}, Altura ${r.plantHeight}cm.`)
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
            else if (userMsg.image) parts.push({ text: "Analiza esta imagen industrial de campo buscando plagas o estados de cultivo." });

            if (userMsg.image) {
                const base64Data = userMsg.image.split(',')[1] || userMsg.image;
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts }],
                config: {
                    systemInstruction: `Eres HempAI, el núcleo de inteligencia avanzada de HempC. 
                    Eres un experto mundial en agronomía, biotecnología y gestión industrial de Cannabis Sativa L. (Cáñamo).
                    Tu objetivo es asistir a técnicos e ingenieros en la toma de decisiones basadas en datos.
                    
                    DATOS DE LA RED OPERATIVA ACTUAL:
                    ${buildContext()}
                    
                    PROTOCOLOS:
                    1. Usa lenguaje técnico de grado ingeniería (fenología, lixiviación, ETP, evapotranspiración, etc).
                    2. Sé preciso y conciso. No saludes innecesariamente.
                    3. Si detectas enfermedades en fotos, sugiere principios activos o manejo orgánico según el caso.
                    4. Respuestas siempre en Español.`
                }
            });

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: response.text || 'Sin respuesta del núcleo de procesamiento.'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err: any) {
            setError(err.message || "Fallo crítico en la conexión neural con el núcleo IA.");
        } finally { setIsLoading(false); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-1000">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-4 rounded-[24px] text-white shadow-2xl shadow-purple-900/20 mr-6">
                        <Cpu size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">HempAI <span className="text-purple-600">Engine</span></h1>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.4em] flex items-center mt-1">
                            <Terminal size={12} className="mr-2"/> Industrial Neural Network v4.0.2
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center space-x-3 bg-slate-100 dark:bg-white/5 px-6 py-3 rounded-2xl border dark:border-white/5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Núcleo Activo</span>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#0a0f1d] rounded-[48px] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col relative">
                {/* Background glow effects */}
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,_rgba(147,51,234,0.03),_transparent_40%)] pointer-events-none"></div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar relative z-10">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-[75%] rounded-[32px] p-8 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-slate-900 dark:bg-purple-600 text-white rounded-tr-none' 
                                : 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-3 mb-4 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                                    {msg.role === 'user' ? 'Terminal Usuario' : 'HempC Logic Unit'}
                                </div>
                                
                                {msg.image && (
                                    <div className="mb-6 rounded-[24px] overflow-hidden border border-white/10 shadow-2xl">
                                        <img src={msg.image} alt="Technical Field Data" className="max-h-[400px] w-full object-cover" />
                                    </div>
                                )}
                                
                                <div className="text-base leading-relaxed font-medium whitespace-pre-wrap">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[32px] rounded-tl-none p-8 flex items-center space-x-4">
                                <RefreshCw className="animate-spin text-purple-600" size={24} />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Procesando telemetría industrial...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-10 bg-white dark:bg-[#0a0f1d] border-t border-slate-100 dark:border-white/10 relative z-10">
                    {selectedImage && (
                        <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 p-4 rounded-[20px] mb-6 w-fit animate-in slide-in-from-bottom-4 shadow-sm border dark:border-purple-500/20">
                            <ImageIcon size={20} className="text-purple-600 mr-3" />
                            <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest mr-6">Material técnico cargado</span>
                            <button onClick={() => setSelectedImage(null)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                        <label className="p-5 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 rounded-[24px] cursor-pointer transition-all border border-slate-200 dark:border-white/5 hover:border-purple-500/50 shadow-inner group">
                            <ImageIcon size={28} className="group-hover:scale-110 transition-transform" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isLoading} />
                        </label>
                        
                        <input 
                            type="text" 
                            className="flex-1 bg-slate-50 dark:bg-[#050810] border border-slate-200 dark:border-white/10 rounded-[24px] px-8 py-5 focus:ring-4 focus:ring-purple-600/10 outline-none text-base dark:text-white placeholder-slate-400 transition-all font-medium shadow-inner"
                            placeholder="Ingrese comando o consulta técnica de campo..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                        />
                        
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && !selectedImage)}
                            className="bg-slate-900 dark:bg-purple-600 text-white p-5 rounded-[24px] hover:shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center group active:scale-90"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={28} /> : <Send size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                        </button>
                    </div>
                </div>
            </div>
            
            {error && (
                <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] flex items-center animate-in slide-in-from-top-4">
                    <AlertTriangle className="mr-4" size={20}/> {error}
                </div>
            )}
        </div>
    );
}
