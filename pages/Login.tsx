import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, AlertCircle, Loader2, ShieldCheck, 
  Leaf, Smartphone, Wifi, WifiOff, Eye, EyeOff, Lock, Mail 
} from 'lucide-react';
import { checkConnection } from '../supabaseClient';

export default function Login() {
  const { currentUser, login, appName, appLogo } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const verify = async () => {
      const isConnected = await checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    };
    verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Por favor ingrese su correo y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Credenciales incorrectas. Verifique su correo y contraseña.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Ocurrió un error al intentar iniciar sesión.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden font-sans bg-white dark:bg-slate-950">
      
      {/* Lado Izquierdo: Branding Corporativo */}
      <div className="hidden lg:flex lg:w-3/5 bg-[#DDDB00] relative p-20 flex-col justify-between overflow-hidden border-r border-yellow-500/20 shadow-inner">
        <div className="relative z-10 flex flex-col h-full justify-center">
          
          {/* LOGO DINÁMICO */}
          <div className="mb-12">
            {appLogo ? (
              <img 
                src={appLogo} 
                alt={appName} 
                className="h-32 w-auto object-contain mb-8 drop-shadow-sm"
              />
            ) : (
              <div className="bg-[#006633] p-6 rounded-[28px] w-fit mb-8 shadow-xl shadow-green-900/30">
                <Leaf size={48} className="text-white" />
              </div>
            )}
            
            <h1 className="text-9xl font-black text-[#006633] tracking-tighter italic uppercase leading-none drop-shadow-sm">
              {appName}
            </h1>
          </div>

          <div className="space-y-8">
            <p className="text-[#006633] text-3xl font-black tracking-tight leading-tight max-w-lg border-l-8 border-[#006633] pl-8 italic">
              Red Cooperativa de Agricultores de Cáñamo Industrial Argentina
            </p>
            
            <div className="h-1 w-48 bg-[#006633] opacity-30 rounded-full"></div>

            <h2 className="text-5xl font-black text-[#006633] leading-tight tracking-tighter uppercase italic opacity-90">
              Plataforma Inteligente <br />
              de trazabilidad y gestión
            </h2>
            
            <p className="text-[#006633]/70 text-2xl font-bold leading-relaxed max-w-md">
              de la bioeconomía del Cáñamo Industrial & Agro 4.0
            </p>
          </div>
        </div>

        {/* ACCESO MÓVIL POR CÓDIGO QR */}
        <div className="absolute bottom-12 left-20 z-20 animate-in slide-in-from-bottom-6 duration-1000">
          <div className="bg-white/20 backdrop-blur-md border border-white/40 p-4 rounded-3xl flex items-center gap-5 shadow-xl max-w-sm">
            <div className="bg-white p-2 rounded-2xl shadow-inner">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`} 
                alt="Mobile Login QR" 
                className="w-20 h-20 mix-blend-multiply opacity-90"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1 text-[#006633]">
                <Smartphone size={18} />
                <p className="font-black text-xs uppercase tracking-widest">Acceso Móvil</p>
              </div>
              <p className="text-[#006633] text-[10px] font-bold leading-tight max-w-[140px]">
                Escanea para operar la estación de campo desde tu celular.
              </p>
            </div>
          </div>
        </div>
        
        <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
      </div>

      {/* Lado Derecho: Formulario de Autenticación */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Header en Pantalla Móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block bg-[#DDDB00] p-6 rounded-3xl mb-4 shadow-xl border border-yellow-400/30">
              {appLogo ? (
                <img src={appLogo} alt={appName} className="h-16 object-contain" />
              ) : (
                <h1 className="text-4xl font-black text-[#006633] italic uppercase tracking-tighter leading-none">{appName}</h1>
              )}
            </div>
            <p className="text-[#006633] font-black text-xs uppercase tracking-[0.3em]">Red Cooperativa Argentina</p>
          </div>

          {/* Encabezado del Formulario */}
          <div className="border-b-2 border-slate-100 dark:border-slate-800 pb-5">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
              Iniciar Sesión
            </h2>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] flex items-center gap-2 mt-2">
              <ShieldCheck size={16} className="text-[#006633]"/> Nodo Nucleus Autenticado
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center border border-red-200 dark:border-red-900/60 animate-in slide-in-from-top-2 shadow-sm">
                <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2 group">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-2">
                <Mail size={14} /> Correo Electrónico
              </label>
              <input 
                required 
                type="email" 
                autoComplete="email"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-sm shadow-sm" 
                placeholder="ej: gaston@hempc.com.ar" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] dark:group-focus-within:text-emerald-400 transition-colors flex items-center gap-2">
                <Lock size={14} /> Contraseña
              </label>
              <div className="relative">
                <input 
                  required 
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full px-5 py-4 pr-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] dark:focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-400 text-sm shadow-sm" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.25em] active:scale-[0.98] transition-all shadow-xl shadow-green-900/20 disabled:opacity-50 flex items-center justify-center group"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Verificando Credenciales...</span>
                </div>
              ) : (
                <>
                  <span>Ingresar al Sistema</span> 
                  <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Estado del Sistema */}
          <div className="pt-4 text-center space-y-3">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              connectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
              'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}>
              {connectionStatus === 'checking' && <Loader2 size={12} className="mr-2 animate-spin"/>}
              {connectionStatus === 'connected' && <Wifi size={12} className="mr-2 text-emerald-600"/>}
              {connectionStatus === 'disconnected' && <WifiOff size={12} className="mr-2 text-amber-600"/>}
              
              {connectionStatus === 'checking' && 'Verificando Red...'}
              {connectionStatus === 'connected' && 'Supabase Cloud Conectado'}
              {connectionStatus === 'disconnected' && 'Modo Autónomo / Local'}
            </div>

            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              &copy; 2026 HempC Nucleus | Red de Cáñamo Industrial Argentina
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
