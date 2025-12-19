
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Settings, X, Save, RefreshCw, Cpu, Sparkles, User, Info } from 'lucide-react';
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
        else { setError('Credenciales de acceso no válidas.'); setIsLoading(false); }
    } catch (err) { setError('Fallo crítico en el nodo de autenticación.'); setIsLoading(false); }
  };

  const handleSaveConfig = () => {
      if (!configUrl.includes('https://') || !configKey) return;
      setIsReloading(true);
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      setTimeout(() => { window.location.reload(); }, 800);
  };

  return (
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-hemp-500 selection:text-white">
      
      {/* INDUSTRIAL GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.1),_transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-[420px] z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* BRANDING */}
        <div className="text-center mb-12">
            <h1 className="text-7xl font-black text-white tracking-tighter uppercase mb-2">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-3 opacity-30">
                <div className="h-[1px] w-12 bg-white"></div>
                <p className="text-white text-[9px] font-black uppercase tracking-[0.4em]">Industrial Control Node</p>
                <div className="h-[1px] w-12 bg-white"></div>
            </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#0a0f1d] border border-white/5 rounded-[32px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-500/20 flex items-center animate-shake">
                            <AlertTriangle size={16} className="mr-3 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminal Auth ID</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="email" required 
                                className="w-full pl-12 pr-4 py-4 bg-[#050810] border border-slate-800 rounded-2xl focus:ring-1 focus:ring-hemp-500 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="name@enterprise.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Access Token</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="password" required 
                                className="w-full pl-12 pr-4 py-4 bg-[#050810] border border-slate-800 rounded-2xl focus:ring-1 focus:ring-hemp-500 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-hemp-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-hemp-500 transition-all flex items-center justify-center disabled:opacity-50 group shadow-xl shadow-hemp-900/20"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : (
                            <>
                                <span>Inicializar Sesión</span>
                                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            {/* CREDITS SECTION */}
            <div className="bg-white/5 px-10 py-6 border-t border-white/5">
                <div className="flex flex-col items-center space-y-4">
                    <div className="flex items-center space-x-8">
                        <div className="text-center">
                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">Lead Engineering</span>
                            <p className="text-[11px] text-slate-400 font-bold">gaston.barea.moreno@gmail.com</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-800"></div>
                        <div className="text-center">
                            <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest block mb-1">AI Tech Partner</span>
                            <p className="text-[11px] text-hemp-500 font-black flex items-center justify-center">
                                <Sparkles size={10} className="mr-1"/> GEMINI PRO
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* CLOUD CONFIG ACTION */}
        {!isCloudReady && (
            <button onClick={() => setShowConfig(true)} className="mt-8 w-full py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-all flex items-center justify-center">
                <Settings size={14} className="mr-2"/> Red de Datos (Configuración)
            </button>
        )}
      </div>

      {/* CONFIG OVERLAY */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0c1120] rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                <div className="px-8 py-6 bg-white/5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-black flex items-center text-xs uppercase tracking-[0.2em]">
                        <Cpu className="mr-3 text-hemp-500" size={20} /> System Init
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-3xl text-blue-200 text-[11px] leading-relaxed flex items-start">
                        <Info className="mr-3 flex-shrink-0 text-blue-500" size={18}/>
                        <p>Vincule este nodo de acceso con su instancia de producción para sincronizar la red de datos industrial.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Database Cluster URL</label>
                        <input type="text" className="w-full border border-slate-800 rounded-2xl p-4 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-1 focus:ring-hemp-500 outline-none" placeholder="https://..." value={configUrl} onChange={e => setConfigUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Secure API Gateway Key</label>
                        <input type="password" className="w-full border border-slate-800 rounded-2xl p-4 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-1 focus:ring-hemp-500 outline-none" placeholder="Vault Access Key..." value={configKey} onChange={e => setConfigKey(e.target.value)} />
                    </div>
                    <button onClick={handleSaveConfig} disabled={isReloading} className="w-full bg-hemp-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-hemp-500 transition shadow-2xl flex justify-center items-center">
                        {isReloading ? <RefreshCw className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isReloading ? 'Sincronizando...' : 'Establecer Conexión'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
