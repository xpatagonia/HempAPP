
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
        await new Promise(r => setTimeout(r, 800));
        const success = await login(email, password);
        if (success) navigate('/');
        else { setError('Acceso denegado: Credenciales inválidas.'); setIsLoading(false); }
    } catch (err) { setError('Fallo crítico de comunicación con el nodo.'); setIsLoading(false); }
  };

  const handleSaveConfig = () => {
      if (!configUrl.includes('https://') || !configKey) return;
      setIsReloading(true);
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      setTimeout(() => { window.location.reload(); }, 800);
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-hemp-500 selection:text-white">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.08),_transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-[440px] z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* BRANDING */}
        <div className="text-center mb-14">
            <h1 className="text-8xl font-black text-white tracking-tighter uppercase mb-2">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-4 opacity-30">
                <div className="h-[1px] w-12 bg-white"></div>
                <p className="text-white text-[10px] font-black uppercase tracking-[0.5em]">Neural Interface v4.0</p>
                <div className="h-[1px] w-12 bg-white"></div>
            </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#0a0f1d] border border-white/5 rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] overflow-hidden">
            <div className="p-12">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-5 rounded-3xl text-[11px] font-black uppercase tracking-widest border border-red-500/20 flex items-center animate-shake">
                            <AlertTriangle size={18} className="mr-3 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Identificación de Usuario</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Mail className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={20} />
                            </div>
                            <input 
                                type="email" required 
                                className="w-full pl-14 pr-6 py-5 bg-[#050810] border border-slate-800 rounded-[24px] focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="name@enterprise.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Token de Seguridad</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Lock className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={20} />
                            </div>
                            <input 
                                type="password" required 
                                className="w-full pl-14 pr-6 py-5 bg-[#050810] border border-slate-800 rounded-[24px] focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-hemp-600 text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] hover:bg-hemp-500 transition-all flex items-center justify-center disabled:opacity-50 group shadow-2xl shadow-hemp-900/40"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={24} /> : (
                            <>
                                <span>Acceder al Sistema</span>
                                <ArrowRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            {/* FOOTER CREDITS */}
            <div className="bg-white/5 px-12 py-8 border-t border-white/5">
                <div className="flex flex-col items-center space-y-5">
                    <div className="flex items-center space-x-10">
                        <div className="text-center">
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">Directiva Técnica</span>
                            <p className="text-[11px] text-slate-400 font-bold">gaston.barea.moreno@gmail.com</p>
                        </div>
                        <div className="h-8 w-px bg-slate-800"></div>
                        <div className="text-center">
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest block mb-1.5">IA Engine</span>
                            <p className="text-[11px] text-hemp-500 font-black flex items-center justify-center">
                                <Sparkles size={12} className="mr-1.5"/> GEMINI 3.5
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* DATABASE LINK ACTION */}
        {!isCloudReady && (
            <button onClick={() => setShowConfig(true)} className="mt-10 w-full py-4 bg-white/5 border border-white/5 rounded-[24px] text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] hover:text-white transition-all flex items-center justify-center">
                <Settings size={14} className="mr-3"/> Configurar Red de Datos
            </button>
        )}
      </div>

      {/* CONFIG OVERLAY */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0c1120] rounded-[48px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                <div className="px-10 py-8 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-black flex items-center text-xs uppercase tracking-[0.3em]">
                        <Cpu className="mr-3 text-hemp-500" size={24} /> System Initializer
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white transition-colors p-2 bg-white/5 rounded-full"><X size={28} /></button>
                </div>
                <div className="p-12 space-y-8">
                    <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[32px] text-blue-200 text-[12px] leading-relaxed flex items-start">
                        <Sparkles className="mr-4 flex-shrink-0 text-blue-500" size={20}/>
                        <p className="font-medium">Vincule su nodo con la instancia global de Supabase para activar la sincronización industrial de datos.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3 ml-2">Cluster URL</label>
                        <input type="text" className="w-full border border-slate-800 rounded-[20px] p-5 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-2 focus:ring-hemp-500 outline-none" placeholder="https://..." value={configUrl} onChange={e => setConfigUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3 ml-2">Secret Vault Key</label>
                        <input type="password" className="w-full border border-slate-800 rounded-[20px] p-5 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-2 focus:ring-hemp-500 outline-none" placeholder="Vault ID..." value={configKey} onChange={e => setConfigKey(e.target.value)} />
                    </div>
                    <button onClick={handleSaveConfig} disabled={isReloading} className="w-full bg-hemp-600 text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] hover:bg-hemp-500 transition shadow-2xl flex justify-center items-center">
                        {isReloading ? <RefreshCw className="animate-spin mr-3"/> : <Save className="mr-3"/>}
                        {isReloading ? 'Estableciendo Conexión...' : 'Confirmar Nodo'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
