import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, X, Key } from 'lucide-react';

// ------------------------------------------------------------------
// CONFIGURACIÓN DE GEMINI API (REST)
// ------------------------------------------------------------------
// Si esta key fue revocada por Google, usa el input en pantalla para probar una nueva.
const HARDCODED_GEMINI_KEY = 'AIzaSyA5Gmha-l3vOJRkI7RfZjVeTefjzbjZisQ'; 
// ------------------------------------------------------------------

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
            text: 'Hola. Soy tu asistente agronómico virtual (v2.5). Tengo acceso a los datos de tus parcelas y variedades cargadas. ¿En qué puedo ayudarte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Estado para gestionar la API Key manualmente si la hardcoded falla
    const [manualKey, setManualKey] = useState('');
    const [showKeyInput, setShowKeyInput] = useState(false);

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
                return `Parcela ${p.name}: Variedad ${v?.name}, en ${l?.name}. Siembra: ${p.sowingDate}.`;
            }),
            registros_recientes: trialRecords.slice(0, 5).map(r => `Registro fecha ${r.date}: Etapa ${r.stage}, Altura ${r.plantHeight}cm.`)
        };
        return JSON.stringify(farmSummary);
    };

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || isLoading) return;

        // Prioridad: 1. Manual Key (UI), 2. Hardcoded Key, 3. Variable Entorno
        const activeKey = manualKey || HARDCODED_GEMINI_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

        if (!activeKey) {
            setError("Falta la API Key. Por favor ingrésala en el botón de llave arriba a la derecha.");
            return;
        }

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
            const systemContext = `Eres un ingeniero agrónomo experto en Cannabis Sativa L. (Cáñamo Industrial). 
            Tu objetivo es asistir al usuario en la toma de decisiones técnicas.
            
            DATOS DE LA GRANJA DEL USUARIO (Contexto Real):
            ${buildContext()}
            
            Reglas:
            1. Responde de forma concisa y técnica pero accesible.
            2. Si te preguntan por una parcela específica, usa los datos provistos.
            3. Si analizas una imagen, busca plagas, deficiencias nutricionales o estados fenológicos.`;

            // Construcción del cuerpo para la API REST
            const parts: any[] = [];
            
            if (userMsg.text) {
                parts.push({ text: userMsg.text });
            } else if (selectedImage) {
                 parts.push({ text: "¿Qué observas en esta imagen?" });
            }

            if (userMsg.image) {
                const base64Data = userMsg.image.split(',')[1] || userMsg.image;
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: base64Data
                    }
                });
            }

            const requestBody = {
                contents: [{
                    role: "user",
                    parts: parts
                }],
                systemInstruction: {
                    parts: [{ text: systemContext }]
                }
            };

            // Usamos el modelo gemini-2.5-flash según instrucciones, fallback a 1.5 si falla la URL específica
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                // Extraemos el mensaje real de Google
                const googleMsg = errorData.error?.message || `Error HTTP ${response.status}`;
                throw new Error(googleMsg);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: textResponse || 'No pude generar una respuesta.'
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (err: any) {
            console.error("Gemini API Error Full:", err);
            
            let userFriendlyError = "Error desconocido.";
            if (err.message.includes('API key not valid')) {
                userFriendlyError = "La API Key es inválida o expiró. Usa el botón de llave 🔑 arriba para ingresar una nueva.";
                setShowKeyInput(true);
            } else if (err.message.includes('404')) {
                userFriendlyError = "Modelo no encontrado. Google puede haber cambiado el nombre del modelo.";
            } else {
                userFriendlyError = `Error de Google: ${err.message}`;
            }

            setError(userFriendlyError);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: '⚠️ Ocurrió un error al procesar tu solicitud. Revisa el mensaje de error arriba.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <Sparkles className="text-purple-600 mr-3" size={32} />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Asistente IA (v2.5)</h1>
                        <p className="text-gray-500 text-sm">Potenciado por Google Gemini</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className={`p-2 rounded-lg transition ${showKeyInput ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Configurar API Key Manual"
                >
                    <Key size={20} />
                </button>
            </div>

            {/* Input manual de API Key (Emergencia) */}
            {showKeyInput && (
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-purple-800 uppercase mb-1">
                        API Key Manual (Temporal)
                    </label>
                    <input 
                        type="password" 
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value)}
                        placeholder="Pega tu API Key de Google AI Studio aquí..."
                        className="w-full border border-purple-200 rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-[10px] text-purple-600 mt-1">
                        Esta clave se usará en lugar de la configurada por defecto. Consigue una gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a>.
                    </p>
                </div>
            )}

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg flex items-start text-sm">
                            <AlertTriangle className="mr-2 flex-shrink-0 mt-0.5" size={16} />
                            <div>
                                <span className="font-bold block">Error de Conexión:</span>
                                {error}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-hemp-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            }`}>
                                <div className="flex items-center gap-2 mb-1 opacity-80 text-xs font-bold uppercase tracking-wider">
                                    {msg.role === 'user' ? <User size={12}/> : <Bot size={12}/>}
                                    {msg.role === 'user' ? 'Tú' : 'HempAI'}
                                </div>
                                
                                {msg.image && (
                                    <div className="mb-3 mt-1">
                                        <img src={msg.image} alt="Upload" className="rounded-lg max-h-48 border border-white/20" />
                                    </div>
                                )}
                                
                                <div className="whitespace-pre-wrap leading-relaxed text-sm">
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center space-x-2">
                                <Loader2 className="animate-spin text-hemp-600" size={18} />
                                <span className="text-gray-500 text-sm">Analizando datos...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    {selectedImage && (
                        <div className="flex items-center bg-gray-100 p-2 rounded-lg mb-2 w-fit">
                            <ImageIcon size={16} className="text-gray-500 mr-2" />
                            <span className="text-xs text-gray-600 mr-2">Imagen seleccionada</span>
                            <button onClick={() => setSelectedImage(null)} className="text-gray-400 hover:text-red-500">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex gap-2">
                        <label className="p-3 text-gray-400 hover:text-hemp-600 hover:bg-gray-50 rounded-lg cursor-pointer transition border border-transparent hover:border-gray-200">
                            <ImageIcon size={24} />
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isLoading} />
                        </label>
                        
                        <input 
                            type="text" 
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none"
                            placeholder="Pregunta sobre tus cultivos o sube una foto..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                        />
                        
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || (!input && !selectedImage)}
                            className="bg-hemp-600 text-white p-3 rounded-lg hover:bg-hemp-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <Send size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}