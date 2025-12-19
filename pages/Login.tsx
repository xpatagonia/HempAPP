
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Leaf, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding y Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-hemp-900 relative p-12 flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path d="M0 100 C 20 0 50 0 100 100" fill="white" />
              </svg>
          </div>
          
          <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-12">
                  <div className="bg-white p-2 rounded-xl text-hemp-700 shadow-xl overflow-hidden flex items-center justify-center min-w-[44px] min-h-[44px]">
                    {appLogo ? <img src={appLogo} alt="Logo" className="w-10 h-10 object-contain" /> : <Leaf size={28} />}
                  </div>
                  <span className="text-3xl font-black text-white tracking-tighter italic">{appName}</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
                  Inteligencia para el <br />
                  <span className="text-hemp-400">Desarrollo Agroindustrial.</span>
              </h1>
              <p className="text-hemp-100 text-lg max-w-md leading-relaxed opacity-80">
                  La plataforma líder en gestión de ensayos agronómicos, trazabilidad de genética y análisis de rendimientos.
              </p>
          </div>

          <div className="relative z-10 flex items-center space-x-6 text-hemp-200">
              <div className="flex items-center space-x-2">
                  <ShieldCheck size={20} />
                  <span className="text-sm font-bold uppercase tracking-widest">Protocolo Seguro</span>
              </div>
              <div className="h-4 w-px bg-hemp-700"></div>
              <span className="text-sm font-medium">v11.0 WhiteLabel</span>
          </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950">
        <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center space-x-2 mb-12 justify-center">
                <div className="p-2 bg-hemp-600 rounded-xl text-white">
                    {appLogo ? <img src={appLogo} alt="Logo" className="w-8 h-8 object-contain" /> : <Leaf size={32} />}
                </div>
                <span className="text-3xl font-black text-slate-900 dark:text-white italic">{appName}</span>
            </div>

            <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Bienvenido</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Inicie sesión para acceder a la terminal de datos.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-bold flex items-center border border-red-100 dark:border-red-900/20">
                        <AlertCircle size={20} className="mr-3 flex-shrink-0"/> {error}
                    </div>
                )}
                
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-hemp-600 transition-colors"><Mail size={18} /></div>
                        <input required type="email" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-hemp-600/5 focus:border-hemp-600 outline-none transition-all dark:text-white font-medium" placeholder="nombre@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contraseña</label>
                        <button type="button" className="text-xs font-bold text-hemp-600 hover:text-hemp-700">¿Olvidó su clave?</button>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-hemp-600 transition-colors"><Lock size={18} /></div>
                        <input required type="password" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-hemp-600/5 focus:border-hemp-600 outline-none transition-all dark:text-white font-medium" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-hemp-600 text-white py-4 rounded-xl font-bold hover:bg-hemp-700 transition-all flex items-center justify-center shadow-lg shadow-hemp-600/20 active:scale-[0.98] disabled:opacity-50">
                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                        <span className="flex items-center">Ingresar al Sistema <ArrowRight size={20} className="ml-2" /></span>
                    )}
                </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-900 text-center">
                <p className="text-slate-400 text-xs font-medium">¿Necesita acceso? <a href="#" className="text-hemp-600 font-bold hover:underline">Contacte al Administrador de {appName}</a></p>
            </div>
        </div>
      </div>
    </div>
  );
}
