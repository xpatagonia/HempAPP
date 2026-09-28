import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, AlertCircle, Loader2, RefreshCw, Zap, ShieldCheck, 
  Leaf, Smartphone, Wifi, WifiOff, Database, Settings, X, Save, CheckCircle2 
} from 'lucide-react';
import { checkConnection, getStoredCredentials, saveSupabaseCredentials } from '../supabaseClient';

export default function Login() {
  const { currentUser, login, loginDemo, appName, appLogo, refreshData } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('gaston.barea.moreno@gmail.com');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  
  // Modal de configuración de Supabase
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [configSaved, setConfigSaved] = useState(false);

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
          const creds = getStoredCredentials();
          setConfigUrl(creds.url || '');
          setConfigKey(creds.key || '');
      };
      verify();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const success = await login(email, password);
        if (success) {
          navigate('/');
        } else {
          setError('Credenciales incorrectas. Puede usar Modo Demo o verificar sus datos.');
          setIsLoading(false);
        }
    } catch (err) {
        setError('Error al procesar el ingreso.');
        setIsLoading(false);
    }
  };

  const handleInstantDemo = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginDemo();
      navigate('/');
    } catch (e) {
      setError('Error al iniciar modo demostración.');
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configUrl || !configKey) {
      alert('Por favor ingrese tanto la URL como la Anon Key de Supabase.');
      return;
    }
    saveSupabaseCredentials(configUrl, configKey);
    setConfigSaved(true);
    setTimeout(async () => {
      setShowConfig(false);
      setConfigSaved(false);
      setConnectionStatus('checking');
      await refreshData();
      const isConnected = await checkConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch overflow-hidden font-sans bg-white">
      
      {/* Lado Izquierdo: Branding */}
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
                      de la bioeconomía del Cáñamo Industrial & Agro 4.0
                  </p>
              </div>
          </div>

          {/* QR CODE SECTION */}
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
          
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/20 rounded-full blur-[120px] opacity-60 pointer-events-none"></div>
          <div className="absolute top-20 right-20 opacity-10 pointer-events-none">
              <Zap size={180} className="text-[#006633] rotate-12"/>
          </div>
      </div>

      {/* Lado Derecho: Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-white dark:bg-slate-950 transition-colors duration-500 relative">
        <div className="w-full max-w-md space-y-8">
            
            {/* Mobile Header Only */}
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

            {/* Header del Formulario */}
            <div className="flex justify-between items-end border-b-2 border-slate-100 dark:border-slate-800 pb-5">
                <div className="space-y-1">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Acceso</h2>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck size={16} className="text-[#006633]"/> Nodo Nucleus Seguro
                    </p>
                </div>
                <button 
                  onClick={() => setShowConfig(true)}
                  className="p-2.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-2xl bg-slate-100 dark:bg-slate-900 shadow-sm transition-all flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider"
                  title="Configurar Supabase Cloud"
                >
                    <Settings size={16} />
                    <span>Cloud DB</span>
                </button>
            </div>

            {/* Botón de Acceso Inmediato / Demostración */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-2 border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider">
                  <Zap size={16} className="text-amber-500" />
                  <span>Acceso Rápido Autónomo</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                  1-Click
                </span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-300/80 font-medium leading-relaxed">
                Ingresa inmediatamente como <strong>Super Admin</strong> con datos agronómicos precargados (lotes, NDVI satelital, sensores de suelo y balance hídrico).
              </p>
              <button
                type="button"
                onClick={handleInstantDemo}
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/20 active:scale-[0.98] transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <span>Entrar Ahora (Modo Completo)</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-slate-400">o ingresa tus credenciales</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 animate-in slide-in-from-top-2 shadow-sm">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-2 group">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Identificador / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-300 text-sm shadow-sm" 
                      placeholder="admin@hempc.com.ar" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#006633] transition-colors">Contraseña Técnica</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-[#006633]/10 focus:border-[#006633] outline-none transition-all text-slate-900 dark:text-white font-bold placeholder-slate-300 text-sm shadow-sm" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-[#006633] hover:bg-[#004d26] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-xl shadow-green-900/20 disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Ingresar al Nodo <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-4 text-center space-y-3">
                {/* Connection Status Indicator */}
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

      {/* Modal de Configuración Supabase */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white font-black text-sm uppercase tracking-wider">
                <Database className="text-emerald-400" size={20} />
                <span>Configurar Supabase Cloud</span>
              </div>
              <button 
                onClick={() => setShowConfig(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 leading-relaxed font-medium">
                Si deseas sincronizar con tu propia base de datos Supabase en la nube, ingresa las credenciales de tu proyecto. Se guardarán en tu navegador.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Project URL
                </label>
                <input 
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={configUrl}
                  onChange={e => setConfigUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Anon Public Key
                </label>
                <input 
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  value={configKey}
                  onChange={e => setConfigKey(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              {configSaved && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 size={16} />
                  <span>¡Credenciales guardadas! Reconectando...</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-700/20"
                >
                  <Save size={16} />
                  <span>Guardar y Reconectar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
