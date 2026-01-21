
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
      if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                  registration.unregister();
              }
          });
      }
      window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row items-stretch overflow-hidden font-sans">
      
      {/* Lado Izquierdo: Branding Corporativo con Fondo Institucional #DDDB03 */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#DDDB03] relative p-20 flex-col justify-between overflow-hidden shadow-2xl">
          <div className="relative z-10">
              <div className="mb-12">
                  <div className="flex items-center gap-3">
                      <h1 className="text-7xl font-black text-hemp-700 tracking-tighter italic uppercase leading-none drop-shadow-sm">
                          HempC <span className="text-slate-900">APP</span>
                      </h1>
                      <span className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest shadow-sm">v56 ULTRA</span>
                  </div>
                  <p className="text-slate-800 mt-2 text-sm font-black tracking-widest opacity-80">
                      www.hempc.com.ar
                  </p>
                  <p className="text-white mt-8 text-3xl font-bold italic tracking-tight drop-shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                      Agroindustria Inteligente
                  </p>
              </div>
              
              <div className="space-y-8 mt-16">
                  <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tighter uppercase italic drop-shadow-md">
                      La Red Cooperativa <br />
                      del Cáñamo <br />
                      Industrial Argentino
                  </h2>
                  
                  <div className="h-2 w-24 bg-white rounded-full opacity-50"></div>
                  
                  <div className="flex items-start gap-10">
                      <p className="text-white text-xl font-medium leading-relaxed max-w-xs drop-shadow-sm">
                          Trazabilidad, Innovación y Bioeconomía. <br />
                          <span className="font-bold">Impulsado por PatagonianC LTDA.</span>
                      </p>

                      {/* INTEGRACIÓN QR ACCESO MÓVIL */}
                      <div className="bg-slate-900/90 backdrop-blur-md p-4 rounded-[24px] border border-white/10 shadow-2xl flex flex-col items-center">
                          <div className="bg-white p-2 rounded-xl mb-3">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${window.location.origin}`} 
                                alt="Acceso Móvil"
                                className="w-20 h-20"
                              />
                          </div>
                          <div className="text-center">
                              <p className="text-[8px] font-black text-hemp-400 uppercase tracking-[0.2em] mb-1">Acceso Móvil</p>
                              <div className="flex items-center justify-center gap-1 text-white">
                                  <Smartphone size={10} />
                                  <span className="text-[7px] font-bold uppercase opacity-60">Sincronizar Terminal</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="relative z-10 flex flex-col space-y-6">
              <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-900 rounded-2xl shadow-lg border border-white/10">
                    <Leaf className="text-[#DDDB03]" size={24} />
                  </div>
                  <div>
                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Sostenibilidad & Trazabilidad</p>
                      <p className="text-[10px] font-bold text-slate-800/60 uppercase tracking-widest">Nucleus Industry v7.0 • 2025</p>
                  </div>
              </div>
              
              {/* Pie de página Lado Izquierdo */}
              <div className="pt-6 border-t border-slate-900/20 grid grid-cols-2 gap-y-4 gap-x-8">
                  <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                          <Globe size={12} className="text-slate-700"/> www.hempc.com.ar
                      </p>
                      <p className="text-[10px] font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                          <Mail size={12} className="text-slate-700"/> info@hempc.com.ar
                      </p>
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest pt-1">
                          PatagonianC LTDA
                      </p>
                  </div>
                  <div className="text-right space-y-1">
                      <p className="text-[10px] font-black text-slate-900 flex items-center justify-end gap-2 uppercase tracking-widest">
                          <Code size={12} className="text-slate-700"/> Dev. xpatagonia.com
                      </p>
                  </div>
              </div>
          </div>
          
          {/* Elementos decorativos de fondo */}
          <div className="absolute -right-20 -bottom-20 w-[600px] h-[600px] bg-white/30 rounded-full blur-[120px]"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-slate-900/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Lado Derecho: Formulario de Acceso (Light Mode Forzado) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 bg-slate-50">
        <div className="w-full max-w-md space-y-12">
            <div className="lg:hidden text-center mb-8">
                <h1 className="text-5xl font-black text-hemp-600 italic uppercase tracking-tighter leading-none">HempC APP</h1>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2" style={{ fontFamily: 'Arial, sans-serif' }}>Agroindustria Inteligente</p>
            </div>

            <div className="flex justify-between items-end">
                <div className="space-y-4">
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Acceso a la Red</h2>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Autenticación de Terminal Autorizada</p>
                </div>
                <button onClick={handleForceRefresh} className="p-2 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all" title="Forzar Recarga V56">
                    <RefreshCw size={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center border border-red-100 animate-in shake duration-300">
                        <AlertCircle size={18} className="mr-3 flex-shrink-0"/>
                        {error}
                    </div>
                )}
                
                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">ID Operario / Email</label>
                    <input 
                      required 
                      type="email" 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-hemp-600/10 focus:border-hemp-600 outline-none transition-all text-slate-900 font-bold placeholder-slate-300" 
                      placeholder="usuario@hempc.com.ar" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-hemp-600">Clave de Enlace</label>
                    <input 
                      required 
                      type="password" 
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-hemp-600/10 focus:border-hemp-600 outline-none transition-all text-slate-900 font-bold placeholder-slate-300" 
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

            <div className="pt-12 border-t border-slate-200 flex flex-col space-y-4 text-center">
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
