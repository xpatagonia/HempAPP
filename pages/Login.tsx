
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Loader2, Leaf, Globe, Mail, Code, QrCode, Smartphone, RefreshCw } from 'lucide-react';

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

  const handleForceRefresh = () => {
      if(window.confirm("¿Recargar aplicación para obtener la última versión V300?")) {
          window.location.href = window.location.origin + '?t=' + Date.now();
      }
  };

  return (
    <div className="min-h-screen bg-[#0f0505] flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding Corporativo con Fondo ROJO V300 */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#450a0a] relative p-20 flex-col justify-between overflow-hidden shadow-2xl border-r border-red-900/30">
          <div className="relative z-10">
              <div className="mb-12">
                  <div className="flex items-center gap-3">
                      <h1 className="text-7xl font-black text-white tracking-tighter italic uppercase leading-none drop-shadow-sm">
                          HempC <span className="text-red-500">APP</span>
                      </h1>
                      <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest shadow-sm border border-red-400">v300 CRIMSON</span>
                  </div>
                  <p className="text-red-300 mt-2 text-sm font-black tracking-widest opacity-80">
                      www.hempc.com.ar
                  </p>
                  <p className="text-gray-300 mt-8 text-3xl font-bold italic tracking-tight drop-shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Agroindustria Inteligente
                  </p>
              </div>
              
              <div className="space-y-8 mt-16">
                  <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter uppercase italic drop-shadow-md">
                      La Red Cooperativa <br />
                      del Cáñamo <br />
                      Industrial Argentino
                  </h2>
                  
                  <div className="h-2 w-24 bg-red-600 rounded-full opacity-50"></div>
                  
                  <div className="flex items-start gap-10">
                      <p className="text-gray-300 text-xl font-medium leading-relaxed max-w-xs drop-shadow-sm">
                          Trazabilidad, Innovación y Bioeconomía. <br />
                          <span className="font-bold text-red-500">Impulsado por PatagonianC LTDA.</span>
                      </p>
                  </div>
              </div>
          </div>

          {/* Elementos decorativos de fondo */}
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[120px]"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Lado Derecho: Formulario de Acceso (Dark Mode Forzado) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-[#0f0505]">
        <div className="w-full max-w-md space-y-12">
            <div className="lg:hidden text-center mb-8">
                <h1 className="text-5xl font-black text-red-500 italic uppercase tracking-tighter leading-none">HempC APP</h1>
                <span className="bg-red-900 text-red-300 text-[9px] px-2 py-0.5 rounded font-bold uppercase border border-red-800">V300</span>
            </div>

            <div className="flex justify-between items-end">
                <div className="space-y-4">
                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">Acceso V300</h2>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Autenticación Segura</p>
                </div>
                <button onClick={handleForceRefresh} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-900/20 rounded-full transition-all" title="Forzar Recarga V300">
                    <RefreshCw size={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-900/20 text-red-400 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-900/50 animate-in shake duration-300">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-red-500">ID Operario / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-5 py-4 bg-[#1a0a0a] border border-gray-800 rounded-2xl focus:ring-4 focus:ring-red-900/20 focus:border-red-600 outline-none transition-all text-white font-bold placeholder-gray-600" 
                      placeholder="usuario@hempc.com.ar" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-red-500">Clave de Enlace</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-5 py-4 bg-[#1a0a0a] border border-gray-800 rounded-2xl focus:ring-4 focus:ring-red-900/20 focus:border-red-600 outline-none transition-all text-white font-bold placeholder-gray-600" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                    />
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-xl shadow-red-900/20 disabled:opacity-50 flex items-center justify-center group"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                        <>Sincronizar Acceso <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" /></>
                    )}
                </button>
            </form>

            <div className="pt-12 border-t border-gray-800 flex flex-col space-y-4 text-center">
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
                    Sistema actualizado: Protocolo Crimson V300
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
