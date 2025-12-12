import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, isEmergencyMode, loading } = useAppContext();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        // Pequeño retardo artificial para UX
        await new Promise(r => setTimeout(r, 500));
        const success = await login(email, password);
        
        if (success) {
            navigate('/');
        } else {
            setError('Credenciales incorrectas.');
            setIsLoading(false);
        }
    } catch (err) {
        setError('Error de conexión.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative">
      {/* Barra superior de confirmación de actualización */}
      <div className="absolute top-0 left-0 w-full bg-hemp-600 h-2"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
            <div className="inline-block p-4 rounded-full bg-white shadow-md mb-4">
                <Leaf className="w-12 h-12 text-hemp-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">HempAPP Sistema</h1>
            <p className="text-gray-500 mt-2">Gestión Integral de Cultivos</p>
        </div>

        {/* ALERTA DE MODO RECUPERACIÓN / EMERGENCIA */}
        {isEmergencyMode && (
            <div className="mb-6 bg-white border-l-4 border-yellow-400 p-4 rounded shadow-sm">
                <div className="flex items-start">
                    <ShieldAlert className="text-yellow-500 mt-0.5 mr-3" size={20} />
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm uppercase">Modo de Recuperación</h3>
                        <p className="text-sm text-gray-600 mt-1">La base de datos está vacía. Usa este acceso temporal para configurar el sistema:</p>
                        <div className="mt-2 bg-gray-100 p-2 rounded text-xs font-mono border border-gray-200">
                            Usuario: <span className="font-bold select-all">admin@demo.com</span><br/>
                            Clave: <span className="font-bold select-all">admin</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded text-sm flex items-center border border-red-100">
                        <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            required 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all"
                            placeholder="nombre@empresa.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading || loading}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-lg font-bold shadow-md hover:bg-gray-800 transition flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <span className="flex items-center">Accediendo...</span>
                    ) : (
                        <>
                            Ingresar al Sistema <ArrowRight size={18} className="ml-2" />
                        </>
                    )}
                </button>
            </form>
        </div>
        
        <div className="mt-8 flex justify-center text-xs text-gray-400">
            <span className="flex items-center"><CheckCircle2 size={12} className="mr-1 text-green-500"/> Sistema Seguro v2.0</span>
        </div>
      </div>
    </div>
  );
}