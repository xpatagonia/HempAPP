
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Terminal, RefreshCw, Cpu, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message { id: string; role: 'user' | 'model' | 'error'; text: string; image?: string; }

export default function AIAdvisor() {
    const { plots, appName } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Sistema de Inteligencia Agrónoma ${appName} v5.6.0.\nEstado del motor: CONECTADO.\n\nListo para procesar diagnósticos y consultas de cultivo.` }
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

        try {
            // Inicialización requerida: utiliza process.env.API_KEY definido en vite.config.ts
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelName = 'gemini-3-pro-preview';
            
            let response;
            if (userMsg.image) {
                const base64Data = userMsg.image.split(',')[1];
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: {
                        parts: [
                            { text: userMsg.text || "Analiza esta imagen de cultivo de cáñamo industrial." },
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                        ]
                    },
                    config: {
                        systemInstruction: `Eres el Asesor Senior de ${appName}. Experto en cáñamo industrial (Cannabis sativa L.), fisiología, plagas y suelos. Responde de forma técnica y científica en Español.`,
                    }
                });
            } else {
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: userMsg.text,
                    config: {
                        systemInstruction: `Eres el Asesor Senior de ${appName}. Experto en cáñamo industrial. Responde de forma técnica y científica en Español.`,
                    }
                });
            }

            // Acceso directo a la propiedad .text según especificaciones
            const responseText = response.text;
            if (responseText) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText }]);
            } else {
                throw new Error("No se pudo obtener una respuesta de texto del motor.");
            }
            
        } catch (err: any) {
            console.error("AI Protocol Error:", err);
            let userError = "Error de comunicación con el motor neural.";
            
            if (err.message?.includes("API_KEY") || !process.env.API_KEY) {
                userError = "FALLO DE AUTENTICACIÓN: La API_KEY no está disponible en el cliente.\n\nAcción requerida:\n1. Verifique que 'API_KEY' esté configurada en Vercel.\n2. Realice un 'Redeploy' manual del proyecto.";
            } else {
                userError = `ERROR TÉCNICO: ${err.message}`;
            }

            setMessages(prev => [...prev, { 
                id: Date.now().toString(), 
                role: 'error', 
                text: userError 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-6">
                    <div className="bg-slate-900 dark:bg-hemp-600 p-4 rounded-[24px] text-white shadow-xl"><Cpu size={32} /></div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">{appName} <span className="text-hemp-600">Advisor</span></h1>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.4em] flex items-center mt-1">
                            <Terminal size={12} className="mr-2"/> ENGINE: GEMINI-3-PRO
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#050810] rounded-[48px] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] md:max-w-[80%] rounded-[32px] p-6 md:p-8 shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-hemp-600 text-white rounded-tr-none' 
                                    : msg.role === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 font-mono text-xs whitespace-pre-wrap'
                                        : 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-2 mb-4 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={12}/> : msg.role === 'error' ? <AlertTriangle size={12}/> : <Bot size={12}/>} 
                                    {msg.role === 'user' ? 'Technical Staff' : msg.role === 'error' ? 'System Failure' : `${appName} Agronomist`}
                                </div>
                                {msg.image && <img src={msg.image} className="mb-4 rounded-2xl max-h-64 w-full object-cover border border-white/10 shadow-lg" alt="Field Sample" />}
                                <div className="text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap font-mono">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[32px] p-6 md:p-8 flex items-center space-x-4">
                                <RefreshCw className="animate-spin text-hemp-600" size={24} />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Procesando Red Neuronal...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6 md:p-10 bg-slate-50/50 dark:bg-black/40 border-t border-slate-200 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <label className="p-4 md:p-5 bg-white dark:bg-white/5 text-slate-400 hover:text-hemp-600 rounded-[24px] cursor-pointer transition-all border border-slate-200 dark:border-white/5 shadow-inner">
                            <ImageIcon size={28} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <input 
                            type="text" className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] px-6 md:px-8 py-4 md:py-5 focus:ring-4 focus:ring-hemp-600/20 outline-none text-base text-slate-800 dark:text-white placeholder-slate-400 font-mono"
                            placeholder="Consultar HempAI sobre diagnóstico, clima o nutrición..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} disabled={isLoading} className="bg-hemp-600 text-white p-4 md:p-5 rounded-[24px] shadow-lg disabled:opacity-30 active:scale-95 transition-all">
                            <Send size={28} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
