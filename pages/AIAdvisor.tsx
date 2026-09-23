
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Terminal, RefreshCw, Cpu, AlertTriangle, Sparkles, Database } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface Message { id: string; role: 'user' | 'model' | 'error'; text: string; image?: string; }

export default function AIAdvisor() {
    const { appName, plots, trialRecords, tasks, varieties } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: `Terminal de Inteligencia ${appName}.\nMotor: Gemini-3-Flash (Alta Velocidad).\n\nHe analizado tus datos en tiempo real. Estoy listo para ayudarte con decisiones agronómicas basadas en la situación actual de tu campo.` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- MOTOR DE CONTEXTO ---
    // Prepara un resumen ejecutivo de la base de datos para inyectarlo en la IA
    const contextData = useMemo(() => {
        const activePlots = plots.filter(p => p.status === 'Activa');
        const criticalPlots = activePlots.filter(p => {
            // Buscar último registro
            const records = trialRecords.filter(r => r.plotId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const last = records[0];
            // Umbral de riesgo: Score > 5 en plagas o enfermedades
            return last && ((last.pestsScore || 0) > 5 || (last.diseasesScore || 0) > 5);
        });
        
        const pendingTasks = tasks.filter(t => t.status === 'Pendiente');
        const highPriorityTasks = pendingTasks.filter(t => t.priority === 'Alta');

        return `
        ESTADO DEL SISTEMA EN TIEMPO REAL (DATOS DE LA FINCA):
        - Total Parcelas Activas: ${activePlots.length}
        - Parcelas con Alerta Sanitaria (Score > 5): ${criticalPlots.length} ${criticalPlots.length > 0 ? `(Nombres: ${criticalPlots.map(p => p.name).join(', ')})` : ''}
        - Tareas Pendientes: ${pendingTasks.length} (${highPriorityTasks.length} de Alta Prioridad)
        - Genéticas sembradas: ${[...new Set(varieties.map(v => v.name))].join(', ')}
        `;
    }, [plots, trialRecords, tasks, varieties]);

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

    const runQuery = async (text: string, img?: string) => {
        if (isLoading) return;
        
        const userMsg: Message = { 
            id: Date.now().toString(), 
            role: 'user', 
            text: text, 
            image: img 
        };
        
        setMessages(prev => [...prev, userMsg]);
        setInput(''); 
        setSelectedImage(null); 
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const modelName = 'gemini-3-flash-preview';
            
            // SYSTEM PROMPT DINÁMICO CON DATOS REALES
            const systemPrompt = `Eres el consultor experto agrónomo de la plataforma ${appName}. 
            Tu objetivo es asistir al productor con decisiones basadas en datos reales de su campo.
            
            CONTEXTO ACTUAL DE LOS DATOS:
            ${contextData}
            
            Instrucciones:
            1. Sé conciso, técnico pero accesible y muy directo.
            2. Usa los datos del sistema proporcionados arriba para dar respuestas específicas (nombra las parcelas si es necesario).
            3. Si detectas parcelas en riesgo en el contexto, prioriza sugerencias sobre ellas.
            4. Responde siempre en Español.`;

            let response;
            if (img) {
                const base64Data = img.split(',')[1];
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: {
                        parts: [
                            { text: text || "Analiza esta imagen." },
                            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                        ]
                    },
                    config: { systemInstruction: systemPrompt }
                });
            } else {
                response = await ai.models.generateContent({
                    model: modelName,
                    contents: text,
                    config: { systemInstruction: systemPrompt }
                });
            }

            if (response.text) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: response.text || '' }]);
            } else {
                throw new Error("Sin respuesta del modelo.");
            }
            
        } catch (err: any) {
            console.error("AI Error:", err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'error', text: `Error: ${err.message || 'Fallo de conexión'}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        if (!input.trim() && !selectedImage) return;
        runQuery(input, selectedImage || undefined);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-6">
                    <div className="bg-slate-900 dark:bg-emerald-600 p-4 rounded-[24px] text-white shadow-xl relative">
                        <Cpu size={32} />
                        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic">{appName} <span className="text-emerald-600">Advisor</span></h1>
                        <div className="flex items-center space-x-3 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 flex items-center">
                                <Database size={10} className="mr-1"/> Datos Conectados
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">v3.0 Gemini Flash</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-[#050810] rounded-[48px] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] md:max-w-[80%] rounded-[32px] p-6 md:p-8 shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                    : msg.role === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                                        : 'bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-2 mb-4 opacity-50 text-[10px] font-black uppercase tracking-widest">
                                    {msg.role === 'user' ? <User size={12}/> : msg.role === 'error' ? <AlertTriangle size={12}/> : <Bot size={12}/>} 
                                    {msg.role === 'user' ? 'Operador' : msg.role === 'error' ? 'Fallo de Red' : 'Sistema Nucleus'}
                                </div>
                                {msg.image && <img src={msg.image} className="mb-4 rounded-2xl max-h-64 w-full object-cover border border-white/10 shadow-lg" alt="Upload" />}
                                <div className="text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap font-mono">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[32px] p-6 md:p-8 flex items-center space-x-4">
                                <RefreshCw className="animate-spin text-emerald-600" size={24} />
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Procesando Trazabilidad...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions & Input */}
                <div className="bg-slate-50/50 dark:bg-black/40 border-t border-slate-200 dark:border-white/5">
                    {/* Quick Prompts Bar */}
                    <div className="flex gap-2 overflow-x-auto p-4 pb-0 no-scrollbar">
                        <button onClick={() => runQuery("Dame un resumen ejecutivo del estado actual de mis cultivos basado en los datos del sistema. Identifica puntos críticos.")} className="whitespace-nowrap px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center shadow-sm">
                            <Sparkles size={12} className="mr-2 text-amber-500"/> Estado General
                        </button>
                        <button onClick={() => runQuery("Analiza las parcelas con alertas sanitarias (si las hay) y sugiere un plan de acción IPM (Manejo Integrado).")} className="whitespace-nowrap px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 hover:border-red-200 transition-all flex items-center shadow-sm">
                            <AlertTriangle size={12} className="mr-2 text-red-500"/> Alertas Sanitarias
                        </button>
                        <button onClick={() => runQuery("Ayúdame a priorizar las tareas pendientes para hoy según urgencia operativa.")} className="whitespace-nowrap px-4 py-2 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-500 hover:border-blue-200 transition-all flex items-center shadow-sm">
                            <RefreshCw size={12} className="mr-2 text-blue-500"/> Priorizar Tareas
                        </button>
                    </div>

                    <div className="p-4 md:p-6 flex items-center gap-4">
                        <label className="p-4 bg-white dark:bg-white/5 text-slate-400 hover:text-emerald-600 rounded-[24px] cursor-pointer transition-all border border-slate-200 dark:border-white/5 hover:border-emerald-200 hover:shadow-lg active:scale-95">
                            <ImageIcon size={24} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <div className="flex-1 relative">
                            <input 
                                type="text" className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[24px] pl-6 pr-12 py-4 focus:ring-4 focus:ring-emerald-600/20 outline-none text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 font-mono shadow-inner"
                                placeholder="Escribe tu consulta agrónoma..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                        </div>
                        <button onClick={handleSend} disabled={isLoading || (!input && !selectedImage)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-[24px] shadow-xl disabled:opacity-30 active:scale-95 transition-all transform">
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
