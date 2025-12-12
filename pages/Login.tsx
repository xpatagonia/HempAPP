import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAppContext();
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
        const success = await login(email, password);
        
        if (success) {
            navigate('/');
        } else {
            setError('Credenciales inválidas. Verifica tu email y contraseña.');
            setIsLoading(false);
        }
    } catch (err) {
        setError('Ocurrió un error al intentar ingresar. Verifica tu conexión.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-hemp-50 to-blue-50 flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-6">
            <div className="bg-white p-3 rounded-full shadow-lg">
                <Leaf className="w-10 h-10 text-hemp-600" />
            </div>
        </div>
        <h1 className="text-center text-3xl font-bold text-gray-800 mb-2">HempAPP</h1>
        <p className="text-center text-gray-500 mb-8">Sistema de Gestión de Ensayos</p>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center">
                        <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="email" 
                            required 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors"
                            placeholder="usuario@empresa.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required 
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hemp-500 focus:border-transparent outline-none transition-colors"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-hemp-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-hemp-700 transition flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Verificando...' : (
                        <>
                            Iniciar Sesión <ArrowRight size={18} className="ml-2" />
                        </>
                    )}
                </button>
            </form>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 font-mono">
        Dev gaston.barea.moreno@gmail.com
      </div>
    </div>
  );
}