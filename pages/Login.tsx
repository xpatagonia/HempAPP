
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
  const [isCloudReady, setIsCloudReady] = useState(false);

  useEffect(() => {
    const initLogin = async () => {
        const storedUrl = localStorage.getItem('hemp_sb_url');
        const storedKey = localStorage.getItem('hemp_sb_key');
        if (storedUrl) setConfigUrl(storedUrl);
        if (storedKey) setConfigKey(storedKey);

        if (hasPreconfiguredConnection) {
            setIsCloudReady(true);
        } else {
            const connected = await checkConnection();
            if (connected) setIsCloudReady(true);
        }
    };
    initLogin();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const success = await login(email, password);
        if (success) navigate('/');
        else { setError('Credenciales de acceso no válidas.'); setIsLoading(false); }
    } catch (err) { setError('Fallo de comunicación con el nodo de datos.'); setIsLoading(false); }
  };

  const handleSaveConfig = () => {
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* INDUSTRIAL GRID */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.08),_transparent_70%)] pointer-events-none"></div>

      <div className="w-full max-w-[440px] z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        <div className="text-center mb-14">
            <h1 className="text-8xl font-black text-white tracking-tighter uppercase mb-2">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-4 opacity-30">
                <p className="text-white text-[10px] font-black uppercase tracking-[0.5em]">Neural Interface v4.0</p>
            </div>
        </div>

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
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">ID Usuario</label>
                        <input 
                            type="email" required 
                            className="w-full px-6 py-5 bg-[#050810] border border-slate-800 rounded-[24px] outline-none text-slate-200 placeholder-slate-800 font-bold focus:ring-2 focus:ring-hemp-500 transition-all"
                            placeholder="name@enterprise.com"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Token Seguridad</label>
                        <input 
                            type="password" required 
                            className="w-full px-6 py-5 bg-[#050810] border border-slate-800 rounded-[24px] outline-none text-slate-200 placeholder-slate-800 font-bold focus:ring-2 focus:ring-hemp-500 transition-all"
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-hemp-600 text-white py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.4em] hover:bg-hemp-500 transition-all flex items-center justify-center disabled:opacity-50 shadow-2xl shadow-hemp-900/40"
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={24} /> : (
                            <>
                                <span>Acceder al Sistema</span>
                                <ArrowRight size={20} className="ml-3" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <div className="bg-white/5 px-12 py-8 border-t border-white/5">
                <div className="flex justify-center items-center space-x-4">
                    <span className="text-[10px] text-hemp-500 font-black tracking-widest flex items-center">
                        <Sparkles size={12} className="mr-1.5"/> GEMINI 3.0 ENGINE
                    </span>
                </div>
            </div>
        </div>

        {!isCloudReady && (
            <button onClick={() => setShowConfig(true)} className="mt-10 w-full py-4 bg-white/5 border border-white/5 rounded-[24px] text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] hover:text-white transition-all">
                <Settings size={14} className="inline mr-2"/> Configurar Red de Datos
            </button>
        )}
      </div>

      {showConfig && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0c1120] rounded-[48px] shadow-2xl max-w-md w-full overflow-hidden border border-white/10 p-12">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-8">System Initializer</h3>
                <div className="space-y-6">
                    <input type="text" className="w-full border border-slate-800 rounded-[20px] p-5 text-xs font-mono text-hemp-400 bg-slate-950 outline-none focus:ring-2 focus:ring-hemp-500" placeholder="Cluster URL" value={configUrl} onChange={e => setConfigUrl(e.target.value)} />
                    <input type="password" className="w-full border border-slate-800 rounded-[20px] p-5 text-xs font-mono text-hemp-400 bg-slate-950 outline-none focus:ring-2 focus:ring-hemp-500" placeholder="Vault Access Key" value={configKey} onChange={e => setConfigKey(e.target.value)} />
                    <button onClick={handleSaveConfig} className="w-full bg-hemp-600 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.4em]">Establecer Conexión</button>
                    <button onClick={() => setShowConfig(false)} className="w-full text-slate-500 font-bold py-2 uppercase text-[10px]">Cerrar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
