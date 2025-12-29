
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2, Leaf, Globe, Mail } from 'lucide-react';

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
        else { setError('Credenciales incorrectas. Verifique e intente de nuevo.'); setIsLoading(false); }
    } catch (err) { setError('Error de conexión con el servidor.'); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding Corporativo con Fondo Institucional #DDDB03 */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DDDB03] relative p-20 flex-col justify-between overflow-hidden shadow-2xl">
          <div className="relative z-10">
              <div className="mb-12">
                  <h1 className="text-7xl font-black text-hemp-600 tracking-tighter italic uppercase leading-none drop-shadow-sm">
                      HempC <span className="text-slate-900">APP</span>
                  </h1>
                  <p className="text-slate-800 mt-2 text-sm font-black tracking-widest opacity-70">
                      www.hempc.com.ar
                  </p>
                  <p className="text-white mt-8 text-3xl font-bold italic tracking-tight drop-shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Agroindustria Inteligente
                  </p>
              </div>
              
              <div className="space-y-8 mt-16">
                  {/* Título en Blanco solicitado por el usuario */}
                  <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter uppercase italic drop-shadow-md">
                      La Red Cooperativa <br />
                      del Cáñamo <br />
                      Industrial Argentino
                  </h2>
                  
                  <div className="h-2 w-24 bg-white rounded-full opacity-50"></div>
                  
                  <p className="text-white text-xl font-medium leading-relaxed max-w-md drop-shadow-sm">
                      Trazabilidad, Innovación y Bioeconomía. <br />
                      <span className="font-bold">Impulsado por PatagonianC LTDA.</span>
                  </p>
              </div>
          </div>

          <div className="relative z-10 flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                  <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
                    <Leaf className="text-[#DDDB03]" size={24} />
                  </div>
                  <div>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Sostenibilidad & Trazabilidad</p>
                      <p className="text-[10px] font-bold text-slate-900/50 uppercase tracking-widest">HempC Network v7.5 • 2025</p>
                  </div>
              </div>
              
              {/* Pie de página Lado Izquierdo */}
              <div className="pt-6 border-t border-slate-900/10 space-y-1">
                  <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <Globe size={12}/> www.hempc.com.ar
                  </p>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <Mail size={12}/> info@hempc.com.ar
                  </p>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest mt-2">
                      PatagonianC LTDA
                  </p>
              </div>
          </div>
          
          {/* Elementos decorativos de fondo suaves */}
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-slate-900/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Lado Derecho: Formulario de Acceso */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-slate-50 dark:bg-slate-950">
        <div className="w-full max-w-md space-y-12">
            <div className="lg:hidden text-center mb-8">
                <h1 className="text-5xl font-black text-hemp-600 italic uppercase tracking-tighter leading-none">HempC APP</h1>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2" style={{ fontFamily: 'Arial, sans-serif' }}>Agroindustria Inteligente</p>
            </div>

            <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Acceso a la Red</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Autenticación de Terminal Autorizada</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 dark:border-red-900/20 animate-in shake duration-300">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">ID Operario / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-hemp-600/10 focus:border-hemp-600 outline-none transition-all dark:text-white font-bold" 
                      placeholder="usuario@red-hempc.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">Clave de Enlace</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-hemp-600/10 focus:border-hemp-600 outline-none transition-all dark:text-white font-bold" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-hemp-600 hover:bg-hemp-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-xl shadow-hemp-600/20 disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Sincronizar Acceso <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-12 border-t border-slate-200 dark:border-slate-900 flex flex-col space-y-4 text-center">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    ¿Nuevo productor en la zona? 
                </p>
                <Link to="/register-producer" className="text-hemp-600 hover:text-hemp-700 font-black uppercase text-xs tracking-widest transition-colors hover:underline underline-offset-8">
                    Postularme a la Red Cooperativa
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
