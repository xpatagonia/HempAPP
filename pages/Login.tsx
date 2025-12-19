
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Database, Settings, X, Save, RefreshCw, CloudOff, Leaf, ShieldCheck, Cpu, Code2, Sparkles, User, Info } from 'lucide-react';
import { hasPreconfiguredConnection, checkConnection } from '../supabaseClient';

export default function Login() {
  const { login, isEmergencyMode } = useAppContext();
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
    <div className="min-h-screen bg-[#050810] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-hemp-500 selection:text-white">
      
      {/* TECH BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.15),_transparent_50%)] pointer-events-none"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>

      <div className="w-full max-w-[440px] z-10 relative animate-in fade-in zoom-in-95 duration-1000">
        
        {/* BRANDING 4.0 */}
        <div className="text-center mb-10">
            <div className="flex justify-center mb-6 relative group">
                <div className="absolute inset-0 bg-hemp-500/30 blur-2xl group-hover:bg-hemp-500/50 transition-all duration-700 rounded-full w-20 h-20 mx-auto"></div>
                <div className="relative z-10 bg-slate-900 border border-hemp-500/30 p-5 rounded-[24px] shadow-2xl group-hover:border-hemp-500/60 transition-all duration-500">
                    <Leaf size={44} className="text-hemp-500" />
                </div>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic">
                HEMP<span className="text-hemp-500 not-italic">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-2">
                <div className="h-px w-8 bg-slate-800"></div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Smart Enterprise Core</p>
                <div className="h-px w-8 bg-slate-800"></div>
            </div>
        </div>

        {/* LOGIN CARD 4.0 */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-500/20 flex items-center animate-in slide-in-from-top-2">
                            <AlertTriangle size={16} className="mr-3 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="email" required 
                                className="w-full pl-12 pr-4 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-hemp-500/30 focus:border-hemp-500/50 outline-none transition-all text-slate-200 placeholder-slate-700 font-bold"
                                placeholder="name@enterprise.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Token (Password)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="text-slate-600 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="password" required 
                                className="w-full pl-12 pr-4 py-4 bg-slate-950/40 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-hemp-500/30 focus:border-hemp-500/50 outline-none transition-all text-slate-200 placeholder-slate-700 font-bold"
                                placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-gradient-to-br from-hemp-600 to-hemp-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-hemp-900/40 hover:shadow-hemp-500/20 hover:translate-y-[-2px] active:translate-y-[0px] transform transition-all flex items-center justify-center disabled:opacity-50"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : (
                            <>
                                <span>Initialize Session</span>
                                <ArrowRight size={18} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <div className="bg-white/5 px-10 py-6 flex flex-col items-center border-t border-white/5">
                <div className="flex items-center space-x-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter mb-2">Lead Developer</span>
                        <div className="flex items-center text-slate-400 font-bold text-[11px] hover:text-white transition-colors cursor-default">
                            {/* Fixed: User component now correctly imported */}
                            <User size={12} className="mr-1.5 text-blue-500"/> Usuario 
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-800"></div>
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter mb-2">Tech Partner (AI)</span>
                        <div className="flex items-center text-slate-400 font-bold text-[11px] hover:text-hemp-400 transition-colors cursor-default">
                            <Sparkles size={12} className="mr-1.5 text-hemp-500"/> Gemini Pro
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* CLOUD CONFIG ACTION */}
        {!isCloudReady && (
            <button onClick={() => setShowConfig(true)} className="mt-8 w-full py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center">
                <Settings size={14} className="mr-2"/> Configure Cloud Node
            </button>
        )}
      </div>

      {/* CONFIG OVERLAY */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0c1120] rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
                <div className="px-8 py-6 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-white font-black flex items-center text-xs uppercase tracking-[0.2em]">
                        <Cpu className="mr-3 text-hemp-500" size={20} /> System Initialization
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>
                <div className="p-10 space-y-6">
                    <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-3xl text-blue-200 text-[11px] leading-relaxed flex items-start">
                        {/* Fixed: Info component now correctly imported */}
                        <Info className="mr-3 flex-shrink-0 text-blue-500" size={18}/>
                        <p>Vincule este nodo de acceso con su instancia de producción en Supabase para sincronizar la red de datos industrial.</p>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Database Cluster URL</label>
                        <input type="text" className="w-full border border-slate-800 rounded-2xl p-4 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-2 focus:ring-hemp-500/50 outline-none" placeholder="https://..." value={configUrl} onChange={e => setConfigUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Secure API Gateway Key</label>
                        <input type="password" className="w-full border border-slate-800 rounded-2xl p-4 text-xs font-mono text-hemp-400 bg-slate-950 focus:ring-2 focus:ring-hemp-500/50 outline-none" placeholder="Vault Access Key..." value={configKey} onChange={e => setConfigKey(e.target.value)} />
                    </div>
                    <button onClick={handleSaveConfig} disabled={isReloading} className="w-full bg-hemp-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-hemp-700 transition shadow-2xl flex justify-center items-center">
                        {isReloading ? <RefreshCw className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isReloading ? 'SYNCING...' : 'INITIALIZE CONNECTION'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
