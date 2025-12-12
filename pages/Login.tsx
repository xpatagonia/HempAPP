import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, AlertTriangle, Database, ShieldCheck, Settings, X, Save, RefreshCw, UserCheck, CloudOff } from 'lucide-react';

export default function Login() {
  const { login, isEmergencyMode, loading } = useAppContext();
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

    // Si estamos en modo emergencia PERO hay datos guardados, probablemente están mal
    if (isEmergencyMode && storedUrl && storedKey) {
        setError('Tus credenciales guardadas parecen incorrectas o expiraron. Por favor revísalas en Configuración.');
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
      // VALIDACIÓN BÁSICA
      if (!configUrl.includes('https://') || !configKey) {
          alert("La URL debe empezar con https:// y la Key no puede estar vacía.");
          return;
      }

      setIsReloading(true);
      // IMPORTANTE: .trim() elimina espacios accidentales al copiar y pegar
      localStorage.setItem('hemp_sb_url', configUrl.trim());
      localStorage.setItem('hemp_sb_key', configKey.trim());
      
      setTimeout(() => {
          window.location.reload();
      }, 1000);
  };

  const fillDemoCredentials = () => {
      setEmail('admin@demo.com');
      setPassword('admin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-hemp-600 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent opacity-50"></div>
      </div>

      {/* Connection Config Button (Top Right) */}
      <button 
        onClick={() => setShowConfig(true)}
        className="absolute top-4 right-4 text-slate-500 hover:text-white flex items-center space-x-2 text-sm transition-colors z-20"
      >
          <Settings size={18} />
          <span>Configurar Conexión</span>
      </button>

      <div className="w-full max-w-md z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-full shadow-2xl mb-4 border border-slate-700">
                <Leaf className="w-10 h-10 text-hemp-500" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">HempAPP</h1>
            <div className="flex items-center justify-center space-x-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-hemp-600 text-white uppercase tracking-wider">Sistema v2.0</span>
                <span className="text-slate-400 text-sm">Producción Cloud</span>
            </div>
        </div>

        {/* Emergency/Rescue Card */}
        {isEmergencyMode && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/50 backdrop-blur-sm p-5 rounded-xl shadow-lg">
                <div className="flex items-start">
                    <CloudOff className="text-amber-500 mr-3 mt-1 flex-shrink-0" size={24} />
                    <div>
                        <h3 className="font-bold text-amber-500 text-lg uppercase tracking-wide">Sin Conexión Cloud</h3>
                        <p className="text-amber-100 text-sm mt-1 mb-3 leading-relaxed">
                            No se pudo conectar a Supabase. Configura tus claves para trabajar en la nube.
                        </p>
                        
                        <div className="flex flex-col space-y-2">
                            <button 
                                onClick={() => setShowConfig(true)}
                                className="w-full text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 px-3 rounded inline-flex items-center justify-center transition shadow-md"
                            >
                                <Settings size={14} className="mr-1"/> Configurar Ahora (Solución)
                            </button>
                             <button 
                                onClick={fillDemoCredentials}
                                className="w-full text-xs bg-transparent border border-amber-500/30 text-amber-200 font-bold py-2 px-3 rounded inline-flex items-center justify-center transition hover:bg-amber-500/20"
                            >
                                <UserCheck size={14} className="mr-1"/> Entrar Modo Local (Temporal)
                            </button>
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
                            <AlertTriangle size={16} className="mr-2 flex-shrink-0"/>
                            <span>{error}</span>
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
            
            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center text-xs text-slate-400">
                    <Database size={12} className="mr-1" />
                    <span>Conexión Segura</span>
                </div>
                <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] text-slate-400 font-mono leading-none mb-0.5">Dev gaston.barea.moreno@gmail.com</p>
                    <a href="https://xpatagonia.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-hemp-600 font-bold font-mono hover:underline">
                        xpatagonia.com
                    </a>
                </div>
            </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center">
                        <Database className="mr-2 text-hemp-500" size={18} /> Configurar Cloud
                    </h3>
                    <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border border-blue-100">
                        Ingresa los datos de tu proyecto Supabase. Estos se guardarán en tu navegador para mantener la conexión.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Project URL</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded p-2 text-sm font-mono focus:ring-2 focus:ring-hemp-500 outline-none"
                            placeholder="https://xyz.supabase.co"
                            value={configUrl}
                            onChange={e => setConfigUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Anon API Key</label>
                        <input 
                            type="password" 
                            className="w-full border border-gray-300 rounded p-2 text-sm font-mono focus:ring-2 focus:ring-hemp-500 outline-none"
                            placeholder="eyJhbG..."
                            value={configKey}
                            onChange={e => setConfigKey(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleSaveConfig}
                        disabled={isReloading}
                        className="w-full bg-hemp-600 text-white py-3 rounded-lg font-bold hover:bg-hemp-700 transition flex justify-center items-center"
                    >
                        {isReloading ? <RefreshCw className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        {isReloading ? 'Guardando...' : 'Guardar y Reconectar'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}