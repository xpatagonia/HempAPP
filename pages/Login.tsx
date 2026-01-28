import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2, RefreshCw, Zap, ShieldCheck, Leaf, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { checkConnection } from '../supabaseClient';

export default function Login() {
  const { login, appName, appLogo } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Get current URL for QR Code
  const currentUrl = window.location.origin;

  useEffect(() => {
      const verify = async () => {
          const isConnected = await checkConnection();
          setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      };
      verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (connectionStatus === 'disconnected') {
        setError('Sin conexión a base de datos. Verifique sus variables de entorno (.env).');
        return;
    }
    setError(''); setIsLoading(true);
    try {
        const success = await login(email, password);
        if (success) navigate('/');
        else { setError('Credenciales incorrectas. Verifique e intente de nuevo.'); setIsLoading(false); }
    } catch (err) { setError('Error de conexión con el servidor.'); setIsLoading(false); }
  };

  const handleForceRefresh = () => {
      if(window.confirm("¿Forzar recarga del sistema?")) {
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden font-sans bg-white">
      
      {/* Lado Izquierdo: Branding con fondo solicitado #DDDB00 */}
      <div className="hidden lg:flex lg:w-3/5 bg-[#DDDB00] relative p-20 flex-col justify-between overflow-hidden border-r border-yellow-500/20 shadow-inner">
          <div className="relative z-10 flex flex-col h-full justify-center">
              
              {/* DYNAMIC LOGO SECTION */}
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
                      de la bio economía del Cáñamo Industrial
                  </p>
              </div>
          </div>

          {/* QR CODE SECTION (NEW) */}
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
                          <p className="font-black text-xs uppercase tracking-widest">Mobile Access</p>
                      </div>
                      <p className="text-[#006633] text-[10px] font-bold leading-tight max-w-[140px]">
                          Escanea para operar la estación de campo desde tu celular.
                      </p>
                  </div>
              </div>
          </div>
          
          {/* Decorative Elements (Subtle) */}
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
          <div className="absolute top-20 right-20 opacity-10 pointer-events-none">
              <Zap size={180} className="text-[#006633] rotate-12"/>
          </div>
      </div>

      {/* Lado Derecho: Formulario con fondo Blanco */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
        <div className="w-full max-w-md space-y-12">
            
            {/* Mobile Header Only */}
            <div className="lg:hidden text-center mb-12">
                <div className="inline-block bg-[#DDDB00] p-6 rounded-3xl mb-4 shadow-xl border border-yellow-400/30">
                    {appLogo ? (
                        <img src={appLogo} alt={appName} className="h-16 object-contain" />
                    ) : (
                        <h1 className="text-4xl font-black text-[#006633] italic uppercase tracking-tighter leading-none">{appName}</h1>
                    )}
                </div>
                <p className="text-[#006633] font-black text-xs uppercase tracking-[0.3em]">Red Cooperativa Argentina</p>
            </div>

            <div className="flex justify-between items-end border-b-2 border-slate-50 dark:border-slate-800 pb-6">
                <div className="space-y-2">
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Acceso</h2>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck size={16} className="text-[#006633]"/> Nodo Nucleus Seguro
                    </p>
                </div>
                <button onClick={handleForceRefresh} className="p-3 text-slate-300 hover:text-[#006633] dark:hover:text-white rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-sm transition-all" title="Recargar Sistema">
                    <RefreshCw size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 animate-in slide-in-from-top-2 shadow-sm">
                        <AlertCircle size={20} className="mr-4 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-3 group">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Identificador / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-300 shadow-sm" 
                      placeholder="usuario@hempc.com.ar" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-3 group">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Contraseña Técnica</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 rounded-3xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-300 shadow-sm" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || connectionStatus === 'disconnected'} 
                  className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.4em] active:scale-[0.98] transition-all shadow-2xl shadow-green-900/20 disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                        <>Ingresar <ArrowRight size={22} className="ml-4 group-hover:translate-x-3 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-8 text-center space-y-4">
                {/* Connection Status Indicator */}
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                    connectionStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                    connectionStatus === 'disconnected' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                    {connectionStatus === 'checking' && <Loader2 size={12} className="mr-2 animate-spin"/>}
                    {connectionStatus === 'connected' && <Wifi size={12} className="mr-2"/>}
                    {connectionStatus === 'disconnected' && <WifiOff size={12} className="mr-2"/>}
                    
                    {connectionStatus === 'checking' && 'Verificando Red...'}
                    {connectionStatus === 'connected' && 'Sistema Online'}
                    {connectionStatus === 'disconnected' && 'Sin Conexión DB'}
                </div>

                <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">
                    &copy; 2025 PatagonianC LTDA | Red Industrial
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
