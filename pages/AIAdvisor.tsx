import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, X } from 'lucide-react';

// ------------------------------------------------------------------
// CONFIGURACIÓN DE GEMINI API
// ------------------------------------------------------------------
// 1. Ve a https://aistudio.google.com/app/apikey
// 2. Crea una API Key gratuita.
// 3. Pégala aquí abajo dentro de las comillas.
const HARDCODED_GEMINI_KEY = 'AIzaSyA5Gmha-l3vOJRkI7RfZjVeTefjzbjZisQ'; // <--- ¡PEGA TU API KEY AQUÍ DENTRO! (Ej: 'AIzaSy...')
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
            text: 'Hola. Soy tu asistente agronómico especializado en cáñamo industrial. Tengo acceso a los datos de tus parcelas y variedades cargadas. ¿En qué puedo ayudarte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const apiKey = HARDCODED_GEMINI_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

    // Scroll al fondo automático
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
        // Resumimos los datos del usuario para dárselos a la IA
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
        if (!apiKey) {
            setError("Falta la API Key de Gemini. Configúrala en el archivo AIAdvisor.tsx.");
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
            const ai = new GoogleGenAI({ apiKey });
            
            // Construimos el System Prompt con el contexto de la granja
            const systemContext = `Eres un ingeniero agrónomo experto en Cannabis Sativa L. (Cáñamo Industrial). 
            Tu objetivo es asistir al usuario en la toma de decisiones técnicas.
            
            DATOS DE LA GRANJA DEL USUARIO (Contexto Real):
            ${buildContext()}
            
            Reglas:
            1. Responde de forma concisa y técnica pero accesible.
            2. Si te preguntan por una parcela específica, usa los datos provistos.
            3. Si analizas una imagen, busca plagas, deficiencias nutricionales o estados fenológicos.
            4. Usa formato Markdown para resaltar datos importantes.`;

            // Preparamos el contenido
            let contentsPayload: any = {
                model: 'gemini-2.5-flash',
                config: { systemInstruction: systemContext }
            };

            // Si hay imagen, estructura multimodal
            if (userMsg.image) {
                // Convertir dataUrl a base64 puro
                const base64Data = userMsg.image.split(',')[1];
                const imagePart = {
                    inlineData: {
                        mimeType: 'image/jpeg', // Asumimos jpeg/png genérico compatible
                        data: base64Data
                    }
                };
                const textPart = { text: userMsg.text || "¿Qué observas en esta imagen?" };
                
                contentsPayload.contents = { parts: [imagePart, textPart] };
            } else {
                // Solo texto
                contentsPayload.contents = userMsg.text;
            }

            const response = await ai.models.generateContent(contentsPayload);
            const textResponse = response.text;

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: textResponse || 'No pude generar una respuesta, intenta de nuevo.'
            };

            setMessages(prev => [...prev, aiMsg]);

        } catch (err: any) {
            console.error("Gemini Error:", err);
            setError("Error al conectar con la IA. Verifica tu API Key o tu conexión.");
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: 'Lo siento, ocurrió un error al procesar tu solicitud. Intenta nuevamente.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex items-center mb-4">
                <Sparkles className="text-purple-600 mr-3" size={32} />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Asistente Agronómico IA</h1>
                    <p className="text-gray-500 text-sm">Potenciado por Google Gemini 2.5</p>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {!apiKey && (
                        <div className="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start">
                            <AlertTriangle className="mr-2 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-bold">API Key no configurada</p>
                                <p className="text-sm">Para usar la IA, edita el archivo <code>pages/AIAdvisor.tsx</code> y pega tu API Key de Google Gemini en la constante <code>HARDCODED_GEMINI_KEY</code>.</p>
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

                {/* Input Area */}
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
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                </div>
            </div>
        </div>
    );
}