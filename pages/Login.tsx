
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, appName } = useAppContext();
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
      
      {/* Lado Izquierdo: Branding Corporativo con color Lima #DDDB03 */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand relative p-16 flex-col justify-between overflow-hidden">
          <div className="relative z-10">
              <div className="mb-16">
                  <h1 className="text-7xl font-black text-slate-900 tracking-tighter italic uppercase leading-[0.85]">
                      {appName} <br />
                      <span className="opacity-30 text-5xl">Nucleus</span>
                  </h1>
              </div>
              <div className="space-y-6 max-w-lg">
                  <h2 className="text-5xl font-black text-slate-900 leading-[1.1] tracking-tighter uppercase italic">
                      La Red Cooperativa <br />del Cáñamo <br />Industrial Argentino
                  </h2>
                  <div className="h-1.5 w-32 bg-slate-900 mt-8"></div>
                  <p className="text-slate-900 text-xl font-bold leading-relaxed opacity-80 pt-4">
                      Trazabilidad, Innovación y Bioeconomía. <br />
                      Impulsado por PatagonianC LTDA.
                  </p>
              </div>
          </div>

          <div className="relative z-10">
              <div className="flex flex-col space-y-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Industria 4.0 & Sostenibilidad</p>
                  <p className="text-[10px] font-bold text-slate-900/60 uppercase tracking-widest">PatagonianC © 2025</p>
              </div>
          </div>
          
          <div className="absolute -right-20 -bottom-20 w-[500px] h-[500px] bg-black/5 rounded-full border-[60px] border-black/5"></div>
      </div>

      {/* Lado Derecho: Botonera y Acceso en Verde */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md space-y-12">
            <div className="lg:hidden text-center mb-8">
                <h1 className="text-5xl font-black text-brand italic uppercase tracking-tighter">{appName}</h1>
            </div>

            <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Ingreso de Personal</h2>
                <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.25em]">Autenticación de Terminal Nucleus</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 dark:border-red-900/20 animate-in shake duration-300">
                        {error}
                    </div>
                )}
                
                <div className="space-y-1 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">ID de Operario (Email)</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-hemp-600 outline-none transition-all dark:text-white font-mono text-sm" 
                      placeholder="usuario@red-nucleus.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-1 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">Clave de Enlace</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-0 py-4 bg-transparent border-b-2 border-slate-100 dark:border-slate-800 focus:border-hemp-600 outline-none transition-all dark:text-white font-mono text-sm" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-hemp-600 hover:bg-hemp-700 text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-[0_20px_50px_-15px_rgba(22,163,74,0.3)] disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Sincronizar Acceso <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-12 border-t border-slate-100 dark:border-slate-900 flex flex-col space-y-4">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
                    ¿No posee acceso técnico autorizado? 
                </p>
                <Link to="/register-producer" className="w-full py-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-brand transition-all">
                    Postularme como Productor de la Red
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
