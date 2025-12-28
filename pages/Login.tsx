
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, appName, appLogo } = useAppContext();
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
        else { setError('Credenciales incorrectas. Verifique e intente de nuevo.'); setIsLoading(false); }
    } catch (err) { setError('Error de conexión con el servidor.'); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding Corporativo Minimalista */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DDDB03] relative p-16 flex-col justify-between overflow-hidden">
          <div className="relative z-10">
              <div className="mb-16">
                  <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                      {appName} <br />
                      <span className="opacity-40">Nucleus</span>
                  </h1>
              </div>
              <div className="space-y-6 max-w-md">
                  <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
                      El Cordón <br />del Cáñamo.
                  </h2>
                  <p className="text-slate-900 text-lg font-medium leading-relaxed opacity-70">
                      Plataforma de trazabilidad industrial para la Red de Agricultores PatagonianC.
                  </p>
              </div>
          </div>

          <div className="relative z-10">
              <div className="flex flex-col space-y-4">
                  <div className="h-1 w-24 bg-slate-900"></div>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Industria 4.0 & Bioeconomía</p>
              </div>
          </div>
          
          {/* Elemento Decorativo */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-black/5 rounded-full border-[40px] border-black/5"></div>
      </div>

      {/* Lado Derecho: Acceso a Terminal */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-12">
            <div className="lg:hidden text-center">
                <h1 className="text-4xl font-black text-[#DDDB03] italic uppercase tracking-tighter">{appName}</h1>
            </div>

            <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Terminal de Acceso</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Introduzca sus credenciales autorizadas</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 dark:border-red-900/20">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/> {error}
                    </div>
                )}
                
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identificador de Usuario</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-[#DDDB03] outline-none transition-all dark:text-white font-mono text-sm" 
                      placeholder="usuario@red-nucleus.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Clave de Enlace</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-[#DDDB03] outline-none transition-all dark:text-white font-mono text-sm" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-slate-900 dark:bg-[#DDDB03] text-white dark:text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-50 flex items-center justify-center"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Conectar con la Red <ArrowRight size={18} className="ml-3" /></>
                    )}
                </button>
            </form>

            <div className="pt-10 border-t border-slate-100 dark:border-slate-900 flex flex-col space-y-4">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
                    ¿No posee acceso técnico? 
                </p>
                <Link to="/register-producer" className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    Postularme como Productor
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
