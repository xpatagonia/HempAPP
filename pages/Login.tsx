
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Settings, X, Save, RefreshCw, Cpu, Sparkles } from 'lucide-react';
import { hasPreconfiguredConnection, checkConnection } from '../supabaseClient';

export default function Login() {
  const { login } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [isCloudReady, setIsCloudReady] = useState(false);

  useEffect(() => {
    const initLogin = async () => {
        const storedUrl = localStorage.getItem('hemp_sb_url');
        const storedKey = localStorage.getItem('hemp_sb_key');
        if (storedUrl) setConfigUrl(storedUrl);
        if (storedKey) setConfigKey(storedKey);

        if (hasPreconfiguredConnection) {
            setIsCloudReady(true);
            setShowConfig(false);
        } else {
            const connected = await checkConnection();
            if (connected) {
                setIsCloudReady(true);
                setShowConfig(false);
            } else if (!storedUrl || !storedKey) {
                setShowConfig(true);
            }
        }
    };
    initLogin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        await new Promise(r => setTimeout(r, 1000)); // Artificial lag for effect
        const success = await login(email, password);
        if (success) navigate('/');
        else { setError('Credenciales de acceso no válidas.'); setIsLoading(false); }
    } catch (err) { setError('Fallo de comunicación con el nodo de datos.'); setIsLoading(false); }
  };

  const handleSaveConfig = () => {
      if (!configUrl.includes('https://') || !configKey) return;
      setIsReloading(true);
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      setTimeout(() => { window.location.reload(); }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-hemp-500 selection:text-white">
      
      {/* INDUSTRIAL GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.08),_transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-[460px] z-10 relative animate-in fade-in slide-in-from-bottom-10 duration-1000">
        
        {/* BRANDING 4.0 */}
        <div className="text-center mb-16">
            <h1 className="text-[120px] font-black text-white tracking-tighter uppercase mb-2 leading-none flex justify-center items-end">
                HEMP<span className="text-hemp-500 italic">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-6 opacity-40">
                <div className="h-[1px] w-16 bg-white"></div>
                <p className="text-white text-[11px] font-black uppercase tracking-[0.8em]">Neural Interface 4.0</p>
                <div className="h-[1px] w-16 bg-white"></div>
            </div>
        </div>

        {/* LOGIN CARD - HIGH CONTRAST */}
        <div className="bg-[#0a0f1d] border border-white/10 rounded-[64px] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden group">
            <div className="p-16">
                <form onSubmit={handleSubmit} className="space-y-10">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-6 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] border border-red-500/20 flex items-center animate-shake">
                            <AlertTriangle size={20} className="mr-4 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Identificación de Usuario</label>
                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Mail className="text-slate-600 group-focus-within/input:text-hemp-500 transition-colors" size={22} />
                            </div>
                            <input 
                                type="email" required 
                                className="w-full pl-16 pr-8 py-6 bg-[#050810] border border-slate-800 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold text-lg"
                                placeholder="name@enterprise.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Token de Seguridad</label>
                        <div className="relative group/input">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Lock className="text-slate-600 group-focus-within/input:text-hemp-500 transition-colors" size={22} />
                            </div>
                            <input 
                                type="password" required 
                                className="w-full pl-16 pr-8 py-6 bg-[#050810] border border-slate-800 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold text-lg"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* REPLACED bg-black with bg-hemp-600 for visibility */}
                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-hemp-600 text-white py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.5em] hover:bg-hemp-500 transition-all flex items-center justify-center disabled:opacity-50 group shadow-2xl shadow-hemp-900/40 hover:scale-[1.02] active:scale-95"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={28} /> : (
                            <>
                                <span>Iniciar Nodo</span>
                                <ArrowRight size={24} className="ml-4 group-hover:translate-x-2 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            {/* FOOTER CREDITS */}
            <div className="bg-white/5 px-16 py-10 border-t border-white/5">
                <div className="flex justify-center items-center">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Sparkles size={14} className="text-purple-500 animate-pulse"/>
                        </div>
                        <span className="text-[10px] text-slate-400 font-black tracking-[0.5em] uppercase">Gemini 3.0 Logic Engine</span>
                    </div>
                </div>
            </div>
        </div>

        {/* DATABASE LINK ACTION */}
        {!isCloudReady && (
            <button onClick={() => setShowConfig(true)} className="mt-12 w-full py-5 bg-white/5 border border-white/5 rounded-[32px] text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] hover:text-white transition-all flex items-center justify-center group">
                <Settings size={16} className="mr-4 group-hover:rotate-90 transition-transform duration-500"/> Configurar Infraestructura
            </button>
        )}
      </div>

      {/* CONFIG MODAL */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-[#0c1120] rounded-[64px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10 animate-in zoom-in-95">
                <div className="px-12 py-10 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-black flex items-center text-[10px] uppercase tracking-[0.4em]">
                        <Cpu className="mr-4 text-hemp-500" size={28} /> System Initializer
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white transition-all p-3 bg-white/5 rounded-full hover:rotate-90"><X size={32} /></button>
                </div>
                <div className="p-16 space-y-10">
                    <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-[40px] text-blue-200 text-xs leading-relaxed flex items-start">
                        <Sparkles className="mr-5 flex-shrink-0 text-blue-500" size={24}/>
                        <p className="font-medium">Vincule su nodo terminal con la instancia global de Supabase para activar la sincronización industrial de datos.</p>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-4">Cloud URL</label>
                        <input type="text" className="w-full border border-slate-800 rounded-[24px] p-6 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-4 focus:ring-hemp-500/20 outline-none transition-all" placeholder="https://..." value={configUrl} onChange={e => setConfigUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-4">Vault Key</label>
                        <input type="password" className="w-full border border-slate-800 rounded-[24px] p-6 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-4 focus:ring-hemp-500/20 outline-none transition-all" placeholder="API Key..." value={configKey} onChange={e => setConfigKey(e.target.value)} />
                    </div>
                    <button onClick={handleSaveConfig} disabled={isReloading} className="w-full bg-hemp-600 text-white py-7 rounded-[32px] font-black text-xs uppercase tracking-[0.5em] hover:bg-hemp-500 transition-all shadow-2xl flex justify-center items-center hover:scale-[1.02] active:scale-95">
                        {isReloading ? <RefreshCw className="animate-spin mr-4"/> : <Save className="mr-4"/>}
                        {isReloading ? 'Estableciendo Enlace...' : 'Confirmar Nodo'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
