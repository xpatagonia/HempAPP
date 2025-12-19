
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Database, Settings, X, Save, RefreshCw, Cpu, Sparkles, User, Info } from 'lucide-react';
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
        else { setError('Credenciales inválidas.'); setIsLoading(false); }
    } catch (err) { setError('Error crítico al iniciar sesión.'); setIsLoading(false); }
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
      
      {/* INDUSTRIAL GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.1),_transparent_70%)] pointer-events-none"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-[420px] z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* BRANDING - STRAIGHT TYPOGRAPHY */}
        <div className="text-center mb-12">
            <h1 className="text-7xl font-black text-white tracking-tighter uppercase mb-2">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-3 opacity-50">
                <div className="h-[1px] w-12 bg-white"></div>
                <p className="text-white text-[9px] font-black uppercase tracking-[0.4em]">Industrial Control Node</p>
                <div className="h-[1px] w-12 bg-white"></div>
            </div>
        </div>

        {/* LOGIN CARD */}
        <div className="bg-[#0a0f1d] border border-white/10 rounded-[20px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] overflow-hidden">
            <div className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-xs font-bold border border-red-500/20 flex items-center animate-shake">
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
                                className="w-full pl-12 pr-4 py-4 bg-[#050810] border border-slate-800 rounded-xl focus:ring-1 focus:ring-hemp-500 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="usuario@hempc.com"
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
                                className="w-full pl-12 pr-4 py-4 bg-[#050810] border border-slate-800 rounded-xl focus:ring-1 focus:ring-hemp-500 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-hemp-600 text-white py-5 rounded-xl font-black text-xs uppercase tracking-[0.3em] hover:bg-hemp-500 transition-all flex items-center justify-center disabled:opacity-50 group"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : (
                            <>
                                <span>Acceder al Sistema</span>
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
            <button onClick={() => setShowConfig(true)} className="mt-8 w-full py-3 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-white transition-all flex items-center justify-center">
                <Settings size={14} className="mr-2"/> Database Initialization
            </button>
        )}
      </div>
    </div>
  );
}
