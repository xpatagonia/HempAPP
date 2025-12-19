
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, ClipboardList, Menu, X, Leaf, LogOut, 
  UserCircle, Users, Settings, Calendar, Sun, Moon, ScanBarcode, 
  Tractor, BookOpen, Clock, Bot, ChevronRight, Sparkles, Shield, Activity
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, highlight = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 ${
        isActive ? 'bg-hemp-600 text-white shadow-[0_10px_30px_rgba(22,163,74,0.3)] translate-x-2' : 
        highlight ? 'text-purple-400 hover:bg-purple-900/20 font-black' : 'text-slate-500 hover:text-hemp-400 hover:bg-white/5'
      }`}>
      <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
      <span className="font-bold tracking-tight text-sm">{label}</span>
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <div className="bg-[#020408] min-h-screen">{children}</div>;

  return (
    <div className="flex h-screen bg-[#020408] text-slate-200 font-sans overflow-hidden">
      {/* SIDEBAR v5.0 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#050810] border-r border-white/5 flex flex-col transition-transform duration-500 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-24 flex items-center px-8">
          <div className="flex items-center space-x-3">
             <div className="bg-hemp-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(22,163,74,0.4)]"><Leaf className="text-white" size={24} /></div>
             <span className="text-2xl font-black tracking-tighter text-white uppercase italic">HEMP<span className="text-hemp-600">C</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Core Control</p>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/advisor" icon={Bot} label="HempAI Assistant" highlight={true} />
          
          <div className="pt-8">
              <p className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Field Ops</p>
              <NavItem to="/locations" icon={Tractor} label="Establecimientos" />
              <NavItem to="/plots" icon={ClipboardList} label="Unidades de Cultivo" />
              <NavItem to="/calendar" icon={Calendar} label="Planificación" />
          </div>

          <div className="pt-8">
              <p className="px-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Logistics</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Gestión Semillas" />
              <NavItem to="/varieties" icon={BookOpen} label="Germoplasma" />
          </div>
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
           <div className="flex items-center space-x-4 mb-6">
               <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-hemp-600 to-hemp-800 flex items-center justify-center text-white shadow-lg"><UserCircle size={28} /></div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-black text-white truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-hemp-500 font-bold uppercase tracking-widest">{currentUser.role.replace('_', ' ')}</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-[10px] text-red-400 hover:bg-red-500/10 p-4 rounded-2xl transition-all font-black uppercase tracking-[0.2em] border border-red-500/20">
               <LogOut size={16} /> <span>Terminate Node</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-[#050810]/80 backdrop-blur-2xl border-b border-white/5 px-10 flex items-center justify-between z-40">
          <div className="flex items-center space-x-4">
              <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden text-white"><Menu size={28}/></button>
              <div className="flex items-center space-x-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Node Status: Active</span>
              </div>
          </div>

          <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Neural Sync</span>
                  <div className="flex items-center text-xs font-bold text-hemp-500"><Clock size={12} className="mr-1.5"/> Real-time v5.0</div>
              </div>
              <button onClick={toggleTheme} className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-hemp-400 transition-all border border-white/10 shadow-inner">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
