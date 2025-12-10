import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Shield, Wrench, Eye } from 'lucide-react';

export default function Login() {
  const { login } = useAppContext();
  const navigate = useNavigate();

  const handleLogin = (role: 'admin' | 'technician' | 'viewer') => {
    login(role);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="flex items-center space-x-2 text-hemp-800 mb-8">
        <Leaf className="w-10 h-10" />
        <span className="font-bold text-3xl">HempTrack</span>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Bienvenido</h2>
        <p className="text-gray-500 text-center mb-8">Selecciona un perfil para ingresar a la demo</p>

        <div className="space-y-4">
          <button 
            onClick={() => handleLogin('admin')}
            className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:border-hemp-500 hover:bg-hemp-50 transition group"
          >
            <div className="bg-white p-3 rounded-full shadow-sm text-hemp-600 group-hover:text-hemp-700">
              <Shield size={24} />
            </div>
            <div className="ml-4 text-left">
              <span className="block font-bold text-gray-800">Administrador</span>
              <span className="text-sm text-gray-500">Acceso total al sistema</span>
            </div>
          </button>

          <button 
            onClick={() => handleLogin('technician')}
            className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:border-blue-500 hover:bg-blue-50 transition group"
          >
             <div className="bg-white p-3 rounded-full shadow-sm text-blue-600 group-hover:text-blue-700">
              <Wrench size={24} />
            </div>
            <div className="ml-4 text-left">
              <span className="block font-bold text-gray-800">Técnico de Campo</span>
              <span className="text-sm text-gray-500">Gestión de parcelas y bitácoras</span>
            </div>
          </button>

          <button 
            onClick={() => handleLogin('viewer')}
            className="w-full flex items-center p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:border-amber-500 hover:bg-amber-50 transition group"
          >
             <div className="bg-white p-3 rounded-full shadow-sm text-amber-600 group-hover:text-amber-700">
              <Eye size={24} />
            </div>
            <div className="ml-4 text-left">
              <span className="block font-bold text-gray-800">Productor / Visita</span>
              <span className="text-sm text-gray-500">Solo lectura de reportes</span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          Demo v1.0 • Acceso seguro simulado
        </div>
      </div>
    </div>
  );
}