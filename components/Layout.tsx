
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Sprout, 
  MapPin, 
  ClipboardList, 
  Menu, 
  X, 
  Leaf,
  LogOut,
  UserCircle,
  FolderOpen,
  Users,
  CheckSquare
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, onClick }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-hemp-600 text-white shadow-md' 
          : 'text-gray-600 hover:bg-hemp-100 hover:text-hemp-800'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  if (!currentUser) return <>{children}</>;

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Administrador';
      case 'technician': return 'Técnico';
      default: return 'Visita';
    }
  };

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 w-full bg-white z-50 border-b px-4 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center space-x-2 text-hemp-800">
          <Leaf className="w-6 h-6" />
          <span className="font-bold text-lg">HempAPP</span>
        </div>
        <button onClick={toggleMobile} className="p-2 text-gray-600">
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b">
            <Leaf className="w-8 h-8 text-hemp-600 mr-2" />
            <span className="text-xl font-bold text-gray-800">HempAPP</span>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <NavItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsMobileOpen(false)} />
            <NavItem to="/projects" icon={FolderOpen} label="Proyectos" onClick={() => setIsMobileOpen(false)} />
            <NavItem to="/tasks" icon={CheckSquare} label="Tareas" onClick={() => setIsMobileOpen(false)} />
            <NavItem to="/plots" icon={ClipboardList} label="Parcelas / Ensayos" onClick={() => setIsMobileOpen(false)} />
            <NavItem to="/varieties" icon={Sprout} label="Variedades" onClick={() => setIsMobileOpen(false)} />
            <NavItem to="/locations" icon={MapPin} label="Locaciones" onClick={() => setIsMobileOpen(false)} />
            
            {isAdminOrSuper && (
               <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Administración</p>
                  <NavItem to="/users" icon={Users} label="Gestión Usuarios" onClick={() => setIsMobileOpen(false)} />
               </div>
            )}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t bg-gray-50">
             <div className="flex items-center space-x-3 mb-3">
               <div className="bg-hemp-100 p-2 rounded-full text-hemp-700">
                 <UserCircle size={24} />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                 <p className="text-xs text-gray-500 truncate capitalize">{getRoleLabel(currentUser.role)}</p>
               </div>
             </div>
             <button 
                onClick={logout}
                className="w-full flex items-center justify-center space-x-2 text-sm text-red-600 hover:bg-red-50 p-2 rounded transition"
             >
               <LogOut size={16} />
               <span>Cerrar Sesión</span>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0 overflow-y-auto h-screen">
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};
