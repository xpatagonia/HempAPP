
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

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

  const handleForceRefresh = () => {
      if(window.confirm("¿Forzar recarga V7.0.6?")) {
          window.location.href = window.location.origin + '?v=706';
      }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding Brand Color #DDDB00 */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DDDB00] relative p-20 flex-col justify-between overflow-hidden shadow-2xl border-r border-yellow-500/20">
          <div className="relative z-10 flex flex-col h-full justify-center">
              
              {/* LOGO SECTION */}
              <div className="mb-10">
                  {/* Reemplaza este src por la ruta de tu logo, ej: "/logo.png" si está en la carpeta public */}
                  <img 
                    src="https://cdn-icons-png.flaticon.com/512/628/628283.png" 
                    alt="HempC Logo" 
                    className="h-24 w-auto object-contain mb-6 drop-shadow-sm"
                  />
                  
                  <h1 className="text-8xl font-black text-[#006633] tracking-tighter italic uppercase leading-none drop-shadow-sm">
                      HempC
                  </h1>
              </div>

              <div className="space-y-8">
                  <p className="text-[#006633] text-2xl font-black tracking-tight leading-tight max-w-lg border-l-8 border-[#006633] pl-6">
                      Red Cooperativa de Agricultores de Cáñamo Industrial Argentina
                  </p>
                  
                  <div className="h-px w-32 bg-[#006633] opacity-50"></div>

                  <h2 className="text-4xl font-black text-[#006633] leading-tight tracking-tighter uppercase italic">
                      Plataforma Inteligente <br />
                      de trazabilidad y gestión
                  </h2>
                  
                  <p className="text-[#006633] text-xl font-bold leading-relaxed max-w-md opacity-90">
                      de la bio economía del Cáñamo Industrial
                  </p>
              </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[100px]"></div>
          <div className="absolute top-20 right-20 opacity-10">
              <Zap size={120} className="text-[#006633] rotate-12"/>
          </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950 transition-colors duration-500">
        <div className="w-full max-w-md space-y-10">
            
            {/* Mobile Header Only */}
            <div className="lg:hidden text-center mb-8">
                <div className="inline-block bg-[#DDDB00] p-4 rounded-3xl mb-4 shadow-lg transform rotate-3">
                    <h1 className="text-4xl font-black text-[#006633] italic uppercase tracking-tighter leading-none">HempC</h1>
                </div>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">Red Cooperativa Argentina</p>
            </div>

            <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Iniciar Sesión</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#006633]"/> Acceso Seguro
                    </p>
                </div>
                <button onClick={handleForceRefresh} className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-white rounded-full transition-all" title="Recargar Sistema">
                    <RefreshCw size={18} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 animate-in slide-in-from-top-2">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Usuario / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400" 
                      placeholder="usuario@hempc.com.ar" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Contraseña</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Ingresar <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-8 text-center">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    &copy; 2025 PatagonianC LTDA
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
