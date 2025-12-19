
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, RefreshCw, Sparkles, Shield, Cpu } from 'lucide-react';

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
        else { setError('AUTH_FAILURE_403'); setIsLoading(false); }
    } catch (err) { setError('NODE_SYNC_ERROR'); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#000500] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* EMERALD v7.0 SCANNER BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-hemp-500 to-transparent animate-[scan_3s_linear_infinite] opacity-50"></div>
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '80px 80px' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-hemp-500/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-[500px] z-10 relative animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <div className="text-center mb-16">
            <h1 className="text-[130px] font-black text-white tracking-tighter uppercase mb-0 leading-[0.75] italic drop-shadow-[0_0_50px_rgba(34,197,94,0.6)]">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-8 mt-14 opacity-60">
                <div className="h-[2px] w-12 bg-hemp-600"></div>
                <p className="text-hemp-500 text-[11px] font-black uppercase tracking-[1.2em] font-mono">EMERALD_NODE_v7</p>
                <div className="h-[2px] w-12 bg-hemp-600"></div>
            </div>
        </div>

        <div className="bg-[#061006] border-2 border-hemp-900/50 rounded-[64px] shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden emerald-glow">
            <div className="p-16">
                <form onSubmit={handleSubmit} className="space-y-12">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-6 rounded-3xl text-[10px] font-black uppercase tracking-[0.5em] border-2 border-red-500/20 flex items-center animate-shake font-mono">
                            <AlertTriangle size={24} className="mr-5 flex-shrink-0"/> <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-5">
                        <label className="block text-[10px] font-black text-hemp-700 uppercase tracking-[1em] ml-8 font-mono">GATEWAY_ID</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-8 flex items-center text-hemp-900 group-focus-within:text-hemp-500 transition-colors"><Mail size={24} /></div>
                            <input required type="email" className="w-full pl-22 pr-10 py-7 bg-black border-2 border-hemp-900/40 rounded-[32px] focus:ring-8 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-white placeholder-hemp-950 font-black text-xl" placeholder="ADMIN@CORE" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-5">
                        <label className="block text-[10px] font-black text-hemp-700 uppercase tracking-[1em] ml-8 font-mono">CIPHER_KEY</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-8 flex items-center text-hemp-900 group-focus-within:text-hemp-500 transition-colors"><Lock size={24} /></div>
                            <input required type="password" className="w-full pl-22 pr-10 py-7 bg-black border-2 border-hemp-900/40 rounded-[32px] focus:ring-8 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-white placeholder-hemp-950 font-black text-xl" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-hemp-600 text-white py-9 rounded-[32px] font-black text-sm uppercase tracking-[1.5em] hover:bg-hemp-500 transition-all flex items-center justify-center shadow-[0_25px_70px_rgba(22,163,74,0.4)] group active:scale-95">
                        {isLoading ? <RefreshCw className="animate-spin" size={32} /> : (
                            <><span>ESTABLISH</span> <ArrowRight size={28} className="ml-6 group-hover:translate-x-6 transition-transform duration-500" /></>
                        )}
                    </button>
                </form>
            </div>
            
            <div className="bg-white/5 px-16 py-12 border-t border-hemp-900/30">
                <div className="flex justify-center items-center space-x-12 text-[10px] text-hemp-900 font-black tracking-[1em] uppercase font-mono">
                    <div className="flex items-center"><Shield size={16} className="mr-3 text-hemp-600"/> SECURE</div>
                    <div className="flex items-center"><Cpu size={16} className="mr-3 text-purple-600"/> CORE</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
