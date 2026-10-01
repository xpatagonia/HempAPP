
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
    Send, Bot, User, Image as ImageIcon, Terminal, RefreshCw, 
    Cpu, AlertTriangle, Sparkles, Database, Key, CheckCircle2, 
    X, ExternalLink, HelpCircle, ShieldCheck, Zap, Info
} from 'lucide-react';
import { 
    getActiveGeminiApiKey, 
    saveUserGeminiApiKey, 
    testGeminiConnection, 
    queryGeminiWithAgronomicFallback 
} from '../src/services/geminiService';

interface Message { 
    id: string; 
    role: 'user' | 'model' | 'error'; 
    text: string; 
    image?: string; 
    source?: 'gemini_api' | 'agronomic_engine';
    modelUsed?: string;
    notice?: string;
}

export default function AIAdvisor() {
    const { appName, plots, trialRecords, tasks, varieties, locations } = useAppContext();
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: '1', 
            role: 'model', 
            text: `Terminal de Inteligencia Agronómica ${appName}.\n\nHe sincronizado tus parcelas, registros biométricos de campo, alertas sanitarias y ciclo biológico. Estoy listo para asistirte en decisiones técnicas de manejo de cáñamo industrial.` 
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modal de Configuración / Test de API Key
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [customKeyInput, setCustomKeyInput] = useState(() => {
        return typeof window !== 'undefined' ? (localStorage.getItem('user_gemini_api_key') || '') : '';
    });
    const [testResult, setTestResult] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

    // Estado de detección de clave activa
    const [activeKeyInfo, setActiveKeyInfo] = useState(() => getActiveGeminiApiKey());

    const refreshKeyInfo = () => {
        setActiveKeyInfo(getActiveGeminiApiKey());
    };

    // --- MOTOR DE CONTEXTO ---
    const contextData = useMemo(() => {
        const activePlots = plots.filter(p => p.status === 'Activa');
        const criticalPlots = activePlots.filter(p => {
            const records = trialRecords.filter(r => r.plotId === p.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const last = records[0];
            return last && ((last.pestsScore || 0) > 4 || (last.diseasesScore || 0) > 4);
        });
        
        const pendingTasks = tasks.filter(t => t.status === 'Pendiente');
        const highPriorityTasks = pendingTasks.filter(t => t.priority === 'Alta');

        return `
        ESTADO DEL SISTEMA EN TIEMPO REAL (DATOS DE LA FINCA):
        - Total Parcelas Activas: ${activePlots.length}
        - Parcelas con Alerta Sanitaria (Score > 4): ${criticalPlots.length} ${criticalPlots.length > 0 ? `(Nombres: ${criticalPlots.map(p => p.name).join(', ')})` : ''}
        - Tareas Pendientes: ${pendingTasks.length} (${highPriorityTasks.length} de Alta Prioridad)
        - Genéticas sembradas: ${[...new Set(varieties.map(v => v.name))].join(', ') || 'Cáñamo Certificado'}
        - Ubicaciones registradas: ${locations.map(l => `${l.name} (${l.province})`).join(', ') || 'Campos Generales'}
        `;
    }, [plots, trialRecords, tasks, varieties, locations]);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages, isLoading]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSelectedImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleTestKey = async () => {
        setTestResult({ loading: true });
        const res = await testGeminiConnection(customKeyInput);
        setTestResult({ loading: false, success: res.success, message: res.message });
    };

    const handleSaveKey = () => {
        saveUserGeminiApiKey(customKeyInput);
        refreshKeyInfo();
        setShowKeyModal(false);
        setTestResult(null);
    };

    const handleRemoveKey = () => {
        saveUserGeminiApiKey('');
        setCustomKeyInput('');
        refreshKeyInfo();
        setTestResult({ loading: false, success: false, message: 'Clave eliminada. El sistema utilizará el motor agronómico local.' });
    };

    const runQuery = async (text: string, img?: string) => {
        if (isLoading || (!text.trim() && !img)) return;
        
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
            const systemPrompt = `Eres el consultor experto agrónomo de la plataforma ${appName}. 
            Tu objetivo es asistir al productor con decisiones técnicas rigurosas sobre cultivo de cáñamo industrial, basadas en datos reales de su campo.
            
            CONTEXTO ACTUAL DE LA FINCA:
            ${contextData}
            
            Instrucciones:
            1. Sé conciso, técnico, riguroso y muy directo.
            2. Usa los datos del sistema para dar respuestas específicas (menciona nombres de parcelas y variedades involucradas).
            3. Si detectas parcelas en riesgo o alertas fitosanitarias, prioriza recomendaciones preventivas.
            4. Responde siempre en Español.`;

            const result = await queryGeminiWithAgronomicFallback({
                prompt: text,
                systemPrompt,
                imageBase64: img,
                dataContext: {
                    appName,
                    plots,
                    trialRecords,
                    tasks,
                    varieties,
                    locations
                }
            });

            setMessages(prev => [
                ...prev, 
                { 
                    id: (Date.now() + 1).toString(), 
                    role: 'model', 
                    text: result.text,
                    source: result.source,
                    modelUsed: result.modelUsed,
                    notice: result.errorNotice
                }
            ]);
            
        } catch (err: any) {
            console.error("AI Terminal Error:", err);
            setMessages(prev => [
                ...prev, 
                { 
                    id: (Date.now() + 1).toString(), 
                    role: 'error', 
                    text: `Error de procesamiento: ${err.message || 'Fallo de consulta en el motor de inteligencia.'}` 
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        if (!input.trim() && !selectedImage) return;
        runQuery(input, selectedImage || undefined);
    };

    const hasActiveKey = activeKeyInfo.key.length > 10;

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-in fade-in duration-700">
            {/* Header de la Terminal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center space-x-4">
                    <div className="bg-slate-900 dark:bg-emerald-600 p-3.5 rounded-[22px] text-white shadow-xl relative shrink-0">
                        <Cpu size={28} />
                        <span className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white ${hasActiveKey ? 'bg-green-500 animate-pulse' : 'bg-cyan-400'}`}></span>
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                                {appName} <span className="text-emerald-600 dark:text-emerald-400">Advisor</span>
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center">
                                <Database size={10} className="mr-1"/> Datos Conectados
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                hasActiveKey 
                                    ? 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' 
                                    : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${hasActiveKey ? 'bg-green-500' : 'bg-cyan-400'}`}></span>
                                {hasActiveKey ? 'Gemini AI Online' : 'Motor Agrónomo Autónomo'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowKeyModal(true)}
                        className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-sm group"
                    >
                        <Key size={14} className="text-emerald-600 group-hover:rotate-12 transition-transform" />
                        <span>{hasActiveKey ? 'Gestionar API Key' : 'Configurar Gemini Key'}</span>
                    </button>
                </div>
            </div>

            {/* Contenedor del Chat */}
            <div className="flex-1 bg-white dark:bg-[#050810] rounded-[36px] md:rounded-[48px] border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-2xl relative">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[92%] md:max-w-[80%] rounded-[28px] p-5 md:p-7 shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                                    : msg.role === 'error'
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                                        : 'bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                            }`}>
                                <div className="flex items-center justify-between gap-2 mb-3 opacity-60 text-[10px] font-black uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-2">
                                    <div className="flex items-center gap-1.5">
                                        {msg.role === 'user' ? <User size={12}/> : msg.role === 'error' ? <AlertTriangle size={12}/> : <Bot size={12}/>} 
                                        <span>{msg.role === 'user' ? 'Operador de Campo' : msg.role === 'error' ? 'Aviso del Sistema' : 'Consultor Agrónomo'}</span>
                                    </div>
                                    {msg.source && (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                                            msg.source === 'gemini_api' 
                                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                                : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                                        }`}>
                                            {msg.source === 'gemini_api' ? `✨ Gemini (${msg.modelUsed || 'v2.5'})` : '🌱 Nucleus Agronomy Core'}
                                        </span>
                                    )}
                                </div>

                                {msg.notice && (
                                    <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                        <div className="flex items-start gap-2">
                                            <Info size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                            <span>{msg.notice}</span>
                                        </div>
                                        {!hasActiveKey && (
                                            <button
                                                onClick={() => setShowKeyModal(true)}
                                                className="shrink-0 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1 self-start sm:self-auto"
                                            >
                                                <Key size={11} />
                                                <span>Conectar Gemini AI</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {msg.image && (
                                    <img src={msg.image} className="mb-4 rounded-2xl max-h-64 w-full object-cover border border-white/10 shadow-lg" alt="Upload" />
                                )}
                                <div className="text-sm md:text-base leading-relaxed font-medium whitespace-pre-wrap font-sans">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] p-5 flex items-center space-x-3 shadow-sm">
                                <RefreshCw className="animate-spin text-emerald-600 dark:text-emerald-400" size={20} />
                                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    Analizando datos agronómicos...
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions & Input Bar */}
                <div className="bg-slate-50/70 dark:bg-black/40 border-t border-slate-200 dark:border-white/5">
                    {/* Botones de Consulta Rápida */}
                    <div className="flex gap-2 overflow-x-auto p-3 pb-0 no-scrollbar">
                        <button 
                            onClick={() => runQuery("Dame un resumen ejecutivo del estado actual de mis cultivos basado en los datos del sistema. Identifica puntos críticos.")} 
                            className="whitespace-nowrap px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center shadow-sm"
                        >
                            <Sparkles size={12} className="mr-1.5 text-amber-500"/> Estado General
                        </button>
                        <button 
                            onClick={() => runQuery("Analiza las parcelas con alertas sanitarias (si las hay) y sugiere un plan de acción IPM (Manejo Integrado).")} 
                            className="whitespace-nowrap px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-300 transition-all flex items-center shadow-sm"
                        >
                            <AlertTriangle size={12} className="mr-1.5 text-red-500"/> Alertas Sanitarias
                        </button>
                        <button 
                            onClick={() => runQuery("¿Cómo optimizar el balance hídrico y riego para el cultivo de cáñamo según su fase fenológica?")} 
                            className="whitespace-nowrap px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:border-blue-300 transition-all flex items-center shadow-sm"
                        >
                            <Zap size={12} className="mr-1.5 text-blue-500"/> Balance Hídrico
                        </button>
                        <button 
                            onClick={() => runQuery("¿Cuál es la proyección de rinde de biomasa y secuestro de carbono en nuestras variedades?")} 
                            className="whitespace-nowrap px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:border-emerald-300 transition-all flex items-center shadow-sm"
                        >
                            <ShieldCheck size={12} className="mr-1.5 text-emerald-500"/> Rinde & Carbono
                        </button>
                    </div>

                    <div className="p-3 md:p-5 flex items-center gap-3">
                        <label 
                            title="Adjuntar imagen para diagnóstico visual" 
                            className="p-3.5 bg-white dark:bg-slate-900 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-2xl cursor-pointer transition-all border border-slate-200 dark:border-slate-800 hover:border-emerald-300 shadow-sm"
                        >
                            <ImageIcon size={20} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        
                        <div className="flex-1 relative">
                            {selectedImage && (
                                <div className="absolute -top-12 left-2 flex items-center gap-2 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
                                    <span>Imagen adjunta</span>
                                    <button onClick={() => setSelectedImage(null)}><X size={12}/></button>
                                </div>
                            )}
                            <input 
                                type="text" 
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-5 pr-12 py-3.5 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 shadow-inner"
                                placeholder="Escribe tu consulta agrónoma (ej: dosis de fertilizante, estado de parcela, riego)..." 
                                value={input} 
                                onChange={e => setInput(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                        </div>
                        
                        <button 
                            onClick={handleSend} 
                            disabled={isLoading || (!input.trim() && !selectedImage)} 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 disabled:opacity-40 active:scale-95 transition-all"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Configuración y Diagnóstico de Gemini API */}
            {showKeyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-5 relative">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        Configuración Gemini API
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                        Google AI Studio Key
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowKeyModal(false); setTestResult(null); }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                    <span className="text-slate-500 dark:text-slate-400">Estado Actual:</span>
                                    <span className={hasActiveKey ? "text-emerald-600 font-black" : "text-amber-500 font-black"}>
                                        {hasActiveKey ? "API Key Configurada" : "Sin API Key (Motor Local Activo)"}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-normal">
                                    Puedes ingresar tu propia API Key de <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-emerald-600 underline font-bold inline-flex items-center">Google AI Studio <ExternalLink size={10} className="ml-0.5"/></a> para activar consultas en vivo con modelos Gemini 2.5 Flash.
                                </p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                    API Key de Gemini:
                                </label>
                                <input
                                    type="password"
                                    value={customKeyInput}
                                    onChange={e => setCustomKeyInput(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Resultado del Test de Conexión */}
                            {testResult && (
                                <div className={`p-3 rounded-xl border text-xs font-medium ${
                                    testResult.loading 
                                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' 
                                        : testResult.success 
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
                                            : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                }`}>
                                    {testResult.loading ? (
                                        <div className="flex items-center space-x-2">
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Probando llamada a Gemini API...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start space-x-2">
                                            {testResult.success ? <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500"/> : <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500"/>}
                                            <span className="leading-tight">{testResult.message}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    onClick={handleTestKey}
                                    disabled={!customKeyInput.trim() || testResult?.loading}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                    Probar Conexión
                                </button>
                                <button
                                    onClick={handleSaveKey}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md"
                                >
                                    Guardar Clave
                                </button>
                            </div>

                            {hasActiveKey && (
                                <button
                                    onClick={handleRemoveKey}
                                    className="w-full text-center text-xs text-red-500 hover:text-red-600 font-bold py-1"
                                >
                                    Eliminar Clave Guardada
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
