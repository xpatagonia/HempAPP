
import React, { useState, useEffect } from 'react';
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
        else { setError('CREDENTIALS_INVALID_ERR'); setIsLoading(false); }
    } catch (err) { setError('NODE_COMMUNICATION_FAULT'); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#010402] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="neural-line opacity-40"></div>
      
      {/* v6.0 SCANNER EFFECT */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(22,163,74,0.12),_transparent_70%)]"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>

      <div className="w-full max-w-[500px] z-10 relative animate-in fade-in slide-in-from-bottom-20 duration-1000">
        <div className="text-center mb-16">
            <h1 className="text-[120px] font-black text-white tracking-tighter uppercase mb-0 leading-[0.75] italic drop-shadow-[0_0_30px_rgba(22,163,74,0.5)]">
                HEMP<span className="text-hemp-500">C</span>
            </h1>
            <div className="flex items-center justify-center space-x-6 mt-12">
                <div className="h-[2px] w-8 bg-hemp-600"></div>
                <p className="text-hemp-500 text-[11px] font-black uppercase tracking-[1em] font-mono">GATEWAY_V6.0</p>
                <div className="h-[2px] w-8 bg-hemp-600"></div>
            </div>
        </div>

        <div className="bg-[#050c06] border-2 border-hemp-900/50 rounded-[64px] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
            <div className="p-16">
                <form onSubmit={handleSubmit} className="space-y-12">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-red-500/20 flex items-center animate-shake font-mono">
                            <AlertTriangle size={20} className="mr-4 flex-shrink-0"/> <span>{error}</span>
                        </div>
                    )}
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-hemp-700 uppercase tracking-[0.5em] ml-6 font-mono">TERMINAL_ID</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-8 flex items-center text-hemp-900 group-focus-within:text-hemp-500 transition-colors"><Mail size={22} /></div>
                            <input required type="email" className="w-full pl-20 pr-10 py-7 bg-black border-2 border-hemp-900/30 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-white placeholder-hemp-950 font-black text-lg" placeholder="USER@CORE.HEMPC" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-hemp-700 uppercase tracking-[0.5em] ml-6 font-mono">ENCRYPTED_KEY</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-8 flex items-center text-hemp-900 group-focus-within:text-hemp-500 transition-colors"><Lock size={22} /></div>
                            <input required type="password" className="w-full pl-20 pr-10 py-7 bg-black border-2 border-hemp-900/30 rounded-[32px] focus:ring-4 focus:ring-hemp-500/10 focus:border-hemp-500 outline-none transition-all text-white placeholder-hemp-950 font-black text-lg" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-hemp-600 text-white py-8 rounded-[32px] font-black text-sm uppercase tracking-[0.8em] hover:bg-hemp-500 transition-all flex items-center justify-center shadow-[0_20px_60px_rgba(22,163,74,0.4)] group active:scale-95">
                        {isLoading ? <RefreshCw className="animate-spin" size={28} /> : (
                            <><span>MOUNT_NODE</span> <ArrowRight size={24} className="ml-4 group-hover:translate-x-4 transition-transform duration-500" /></>
                        )}
                    </button>
                </form>
            </div>
            <div className="bg-white/5 px-16 py-10 border-t border-hemp-900/20">
                <div className="flex justify-center items-center space-x-8 text-[10px] text-hemp-900 font-black tracking-[0.5em] uppercase font-mono">
                    <div className="flex items-center"><Shield size={14} className="mr-2 text-hemp-600"/> HARDENED</div>
                    <div className="flex items-center"><Cpu size={14} className="mr-2 text-purple-600"/> NEURAL</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
