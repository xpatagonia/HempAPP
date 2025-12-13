import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertTriangle, Database, Settings, X, Save, RefreshCw, UserCheck, CloudOff, Leaf, Tractor } from 'lucide-react';

export default function Login() {
  const { login, isEmergencyMode } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Config Modal State
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    // Cargar config existente
    const storedUrl = localStorage.getItem('hemp_sb_url');
    const storedKey = localStorage.getItem('hemp_sb_key');
    
    if (storedUrl) setConfigUrl(storedUrl);
    if (storedKey) setConfigKey(storedKey);

    if (isEmergencyMode && storedUrl && storedKey) {
        setError('Tus credenciales guardadas parecen incorrectas o expiraron.');
    }
  }, [isEmergencyMode]);

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

  const handleSaveConfig = () => {
      if (!configUrl.includes('https://') || !configKey) {
          alert("La URL debe empezar con https:// y la Key no puede estar vacía.");
          return;
      }
      setIsReloading(true);
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      setTimeout(() => { window.location.reload(); }, 1000);
  };

  const fillDemoCredentials = () => {
      setEmail('admin@demo.com');
      setPassword('admin');
  };

  const loginAsClient = async () => {
      // Create a temporary client session logic here or assume a standard client login
      // For now, we simulate a login by creating a dummy client user in Context if needed,
      // but strictly we should use existing users. 
      // If we are in emergency mode, we can just login.
      alert("Para ver la vista de cliente, asegúrate de crear un usuario con rol 'client' en el panel de admin primero, o usa las credenciales de un cliente real.");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-hemp-500 selection:text-white">
      
      {/* --- BACKGROUND EFFECTS --- */}
      {/* Gradient superior */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-hemp-900/20 via-slate-950 to-slate-950 pointer-events-none"></div>
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="w-full max-w-[420px] z-10 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* BRANDING HEADER */}
        <div className="text-center mb-8 relative">
            <div className="flex justify-center mb-6 relative group">
                <div className="absolute inset-0 bg-hemp-500 blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 rounded-full w-2/3 mx-auto"></div>
                {/* ICONO ESTILIZADO (Reemplazo de logo.png) */}
                <div className="relative z-10 bg-slate-900/50 p-4 rounded-2xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform duration-500 backdrop-blur-sm">
                    <Leaf size={48} className="text-hemp-500" />
                </div>
            </div>
            
            {/* TEXTO DESTACADO */}
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                HempC <span className="text-hemp-500">App</span>
            </h1>
            
            <p className="text-slate-400 text-sm font-medium">Gestión Inteligente de Cultivos & Ensayos</p>
        </div>

        {/* EMERGENCY MODE ALERT */}
        {isEmergencyMode && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md p-4 rounded-xl shadow-lg animate-pulse">
                <div className="flex items-start">
                    <CloudOff className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                    <div className="w-full">
                        <h3 className="font-bold text-amber-500 text-sm uppercase tracking-wide mb-1">Modo Desconectado</h3>
                        <p className="text-amber-100/80 text-xs mb-3">
                            No hay conexión con la base de datos cloud.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={fillDemoCredentials} className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 py-1.5 px-3 rounded transition flex items-center justify-center">
                                <UserCheck size={12} className="mr-1"/> Usar Demo Admin
                            </button>
                            <button onClick={() => setShowConfig(true)} className="text-xs bg-amber-600 hover:bg-amber-700 text-white py-1.5 px-3 rounded transition flex items-center justify-center font-bold shadow-md">
                                <Settings size={12} className="mr-1"/> Configurar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LOGIN CARD */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Form Section */}
            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm font-medium border border-red-500/20 flex items-center animate-in fade-in">
                            <AlertTriangle size={16} className="mr-2 flex-shrink-0"/>
                            <span>{error}</span>
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Corporativo</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="text-slate-500 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="email" 
                                required 
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-hemp-500/50 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-600 font-medium"
                                placeholder="usuario@empresa.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="text-slate-500 group-focus-within:text-hemp-500 transition-colors" size={18} />
                            </div>
                            <input 
                                type="password" 
                                required 
                                className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-hemp-500/50 focus:border-hemp-500 outline-none transition-all text-slate-200 placeholder-slate-600 font-medium"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-hemp-600 to-hemp-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg shadow-hemp-900/20 hover:shadow-hemp-500/20 hover:scale-[1.01] active:scale-[0.99] transform transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed border border-white/10 mt-2 group"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                <span>Verificando...</span>
                            </div>
                        ) : (
                            <>
                                <span>Acceder al Sistema</span>
                                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            {/* Footer Section */}
            <div className="bg-slate-950/30 px-8 py-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-500">
                    <Database size={12} className="mr-1.5 text-slate-600" />
                    <span className="font-mono">v2.6-prod</span>
                </div>
                <div className="flex items-center space-x-4">
                     <span className="text-[10px] text-slate-600 font-medium">POWERED BY</span>
                     <a href="https://xpatagonia.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 font-bold hover:text-hemp-400 transition-colors">
                        XPATAGONIA
                     </a>
                </div>
            </div>
        </div>
      </div>

      {/* Config Modal (Overlay) */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center text-sm uppercase tracking-wide">
                        <Database className="mr-2 text-hemp-500" size={16} /> Configuración de Base de Datos
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs leading-relaxed border border-blue-100">
                        Ingresa las credenciales de tu proyecto <strong>Supabase</strong>. Estos datos se guardan localmente en tu navegador.
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Project URL</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono text-gray-600 focus:ring-2 focus:ring-hemp-500 outline-none bg-gray-50"
                            placeholder="https://xyz.supabase.co"
                            value={configUrl}
                            onChange={e => setConfigUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Anon API Key</label>
                        <input 
                            type="password" 
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono text-gray-600 focus:ring-2 focus:ring-hemp-500 outline-none bg-gray-50"
                            placeholder="eyJhbG..."
                            value={configKey}
                            onChange={e => setConfigKey(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleSaveConfig}
                        disabled={isReloading}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex justify-center items-center shadow-lg"
                    >
                        {isReloading ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                        {isReloading ? 'Guardando...' : 'Guardar y Reconectar'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}