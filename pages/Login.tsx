import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, AlertTriangle, Database, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login, isEmergencyMode, loading } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        await new Promise(r => setTimeout(r, 800)); // Pequeña espera visual
        const success = await login(email, password);
        
        if (success) {
            navigate('/');
        } else {
            setError('Credenciales inválidas.');
            setIsLoading(false);
        }
    } catch (err) {
        setError('Error crítico al iniciar sesión.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-hemp-600 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-50"></div>
      </div>

      <div className="w-full max-w-md z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-full shadow-2xl mb-4 border border-slate-700">
                <Leaf className="w-10 h-10 text-hemp-500" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">HempAPP</h1>
            <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-hemp-600 text-white uppercase tracking-wider">Sistema v2.0</span>
                <span className="text-slate-400 text-sm">Producción</span>
            </div>
        </div>

        {/* Emergency/Rescue Card */}
        {isEmergencyMode && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/50 backdrop-blur-sm p-5 rounded-xl shadow-lg animate-pulse">
                <div className="flex items-start">
                    <AlertTriangle className="text-amber-500 mr-3 mt-1 flex-shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-amber-500 text-lg uppercase tracking-wide">Modo de Rescate</h3>
                        <p className="text-amber-100 text-sm mt-1 mb-3 leading-relaxed">
                            No se detectaron usuarios en la base de datos o hubo un error de conexión.
                        </p>
                        <div className="bg-black/30 p-3 rounded-lg border border-amber-500/30">
                            <p className="text-xs text-amber-400 font-mono mb-1">USA ESTAS CREDENCIALES:</p>
                            <div className="flex justify-between items-center text-white font-mono text-sm">
                                <span>User: <strong>admin@demo.com</strong></span>
                            </div>
                            <div className="flex justify-between items-center text-white font-mono text-sm">
                                <span>Pass: <strong>admin</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 flex items-center">
                            <AlertTriangle size={16} className="mr-2"/>
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Usuario / Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all text-slate-800 font-medium"
                                placeholder="ej. admin@demo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input 
                                type="password" 
                                required 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all text-slate-800 font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 hover:scale-[1.02] transform transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Conectando...' : (
                            <>
                                Ingresar <ArrowRight size={20} className="ml-2" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
                <div className="flex items-center text-xs text-slate-400">
                    <Database size={12} className="mr-1" />
                    <span>Conexión Segura</span>
                </div>
                <div className="flex items-center text-xs text-hemp-600 font-semibold">
                    <ShieldCheck size={12} className="mr-1" />
                    <span>HempAPP Pro</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}