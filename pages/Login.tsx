
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, RefreshCw, Sparkles, Shield } from 'lucide-react';

export default function Login() {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    try {
        const success = await login(email, password);
        if (success) navigate('/');
        else { setError('Credenciales de acceso no válidas.'); setIsLoading(false); }
    } catch (err) { setError('Fallo de comunicación con el nodo.'); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#02040a] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Tech Effects */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '50px 50px' }}></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.1),_transparent_70%)]"></div>

      <div className="w-full max-w-[480px] z-10 relative animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <div className="text-center mb-16">
            <h1 className="text-[140px] font-black text-white tracking-tighter uppercase mb-0 leading-[0.7] italic">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-6 opacity-40 mt-10">
                <div className="h-[1px] w-12 bg-white"></div>
                <p className="text-white text-[11px] font-black uppercase tracking-[0.8em]">Industrial Node v5.0</p>
                <div className="h-[1px] w-12 bg-white"></div>
            </div>
        </div>

        <div className="bg-[#0a0f1d] border border-white/10 rounded-[64px] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] overflow-hidden">
            <div className="p-16">
                <form onSubmit={handleSubmit} className="space-y-10">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-6 rounded-3xl text-xs font-black uppercase tracking-widest border border-red-500/20 flex items-center animate-shake">
                            <AlertTriangle size={20} className="mr-4 flex-shrink-0"/> <span>{error}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Terminal ID</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-600 group-focus-within:text-hemp-500 transition-colors"><Mail size={22} /></div>
                            <input required type="email" className="w-full pl-16 pr-8 py-6 bg-[#050810] border border-slate-800 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold text-lg" placeholder="name@enterprise.com" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] ml-4">Access Key</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-600 group-focus-within:text-hemp-500 transition-colors"><Lock size={22} /></div>
                            <input required type="password" className="w-full pl-16 pr-8 py-6 bg-[#050810] border border-slate-800 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-800 font-bold text-lg" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-hemp-600 text-white py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.5em] hover:bg-hemp-500 transition-all flex items-center justify-center shadow-[0_20px_40px_rgba(22,163,74,0.3)] group">
                        {isLoading ? <RefreshCw className="animate-spin" size={28} /> : (
                            <><span>Establish Connection</span> <ArrowRight size={24} className="ml-4 group-hover:translate-x-2 transition-transform" /></>
                        )}
                    </button>
                </form>
            </div>
            <div className="bg-white/5 px-16 py-10 border-t border-white/5">
                <div className="flex justify-center items-center space-x-6 text-[10px] text-slate-600 font-black tracking-[0.4em] uppercase">
                    <div className="flex items-center"><Shield size={14} className="mr-2 text-hemp-500"/> Secured</div>
                    <div className="flex items-center"><Sparkles size={14} className="mr-2 text-purple-500"/> Neural Engine</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
