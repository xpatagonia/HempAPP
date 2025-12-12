import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Send, Bot, User, Image as ImageIcon, Loader2, Sparkles, AlertTriangle, X } from 'lucide-react';

// ------------------------------------------------------------------
// CONFIGURACIÓN DE GEMINI API (REST)
// ------------------------------------------------------------------
// FIX: Uso de API REST directa para eliminar dependencia @google/genai que causaba error en Vercel.
// Timestamp: Fix aplicado para forzar detección de cambios en git.
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
            text: 'Hola. Soy tu asistente agronómico virtual. Tengo acceso a los datos de tus parcelas y variedades cargadas. ¿En qué puedo ayudarte hoy?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const apiKey = HARDCODED_GEMINI_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;

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
        if (!apiKey) {
            setError("Falta la API Key de Gemini.");
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

            // Construcción del cuerpo para la API REST (Sin SDK)
            const parts: any[] = [];
            
            if (userMsg.text) {
                parts.push({ text: userMsg.text });
            } else if (selectedImage) {
                 parts.push({ text: "¿Qué observas en esta imagen?" });
            }

            if (userMsg.image) {
                // Eliminar prefijo data:image/jpeg;base64, si existe
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

            // FETCH NATIVO: Reemplaza la librería @google/genai
            // Esto evita errores de 'Rollup failed to resolve import'
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error en la respuesta de Gemini');
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
            console.error("Gemini API Error:", err);
            setError("Error de conexión con la IA. Intenta nuevamente.");
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: 'Lo siento, hubo un problema técnico. Por favor intenta de nuevo.'
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
                    <h1 className="text-2xl font-bold text-gray-800">Asistente IA (v2.2)</h1>
                    <p className="text-gray-500 text-sm">Potenciado por Google Gemini</p>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {!apiKey && (
                        <div className="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start">
                            <AlertTriangle className="mr-2 flex-shrink-0" size={20} />
                            <div>
                                <p className="font-bold">API Key no configurada</p>
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
                    {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
                </div>
            </div>
        </div>
    );
}