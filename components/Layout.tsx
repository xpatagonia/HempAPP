
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, Menu, Leaf, LogOut, 
  UserCircle, Calendar, Sun, Moon, ScanBarcode, 
  Tractor, BookOpen, Clock, Bot, ChevronRight, Cpu, Activity, Shield
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, highlight = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-500 ${
        isActive ? 'bg-hemp-600 text-white shadow-[0_0_30px_rgba(22,163,74,0.5)] scale-105' : 
        highlight ? 'text-hemp-400 bg-hemp-900/20 font-black' : 'text-slate-500 hover:text-hemp-400 hover:bg-hemp-900/10'
      }`}>
      <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
      <span className="font-bold tracking-tighter text-sm uppercase">{label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white ml-auto"></div>}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <div className="bg-[#000500] min-h-screen">{children}</div>;

  return (
    <div className="flex h-screen bg-[#000500] text-slate-300 font-sans overflow-hidden">
      {/* SIDEBAR v7.0 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#061006] border-r border-hemp-900/50 flex flex-col transition-all duration-700 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-24 flex items-center px-8">
          <div className="flex items-center space-x-3 group cursor-pointer">
             <div className="bg-hemp-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(22,163,74,0.4)] group-hover:rotate-12 transition-transform"><Leaf className="text-white" size={24} /></div>
             <span className="text-2xl font-black tracking-tighter text-white italic">HEMP<span className="text-hemp-500">C</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/advisor" icon={Cpu} label="HempAI Core" highlight={true} />
          
          <div className="pt-8 space-y-1">
              <p className="px-6 text-[9px] font-black text-hemp-800 uppercase tracking-[0.5em] mb-4">Unidades</p>
              <NavItem to="/locations" icon={Tractor} label="Establecimientos" />
              <NavItem to="/plots" icon={Sprout} label="Parcelas" />
              <NavItem to="/calendar" icon={Calendar} label="Planificación" />
          </div>

          <div className="pt-8 space-y-1">
              <p className="px-6 text-[9px] font-black text-hemp-800 uppercase tracking-[0.5em] mb-4">Logística</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Inventario" />
              <NavItem to="/varieties" icon={BookOpen} label="Genética" />
          </div>
        </nav>

        <div className="p-6 border-t border-hemp-900/50 bg-black/40">
           <div className="flex items-center space-x-4 mb-6 p-3 bg-hemp-900/20 rounded-2xl border border-hemp-900/30">
               <div className="h-10 w-10 rounded-xl bg-hemp-600 flex items-center justify-center text-white"><UserCircle size={24} /></div>
               <div className="flex-1 min-w-0">
                   <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-hemp-500 font-bold uppercase tracking-widest">Protocol_Active</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-[10px] text-red-500 hover:bg-red-500/10 p-4 rounded-2xl transition-all font-black uppercase tracking-[0.2em] border border-red-500/20">
               <LogOut size={16} /> <span>Terminate</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-[#061006]/80 backdrop-blur-2xl border-b border-hemp-900/50 px-10 flex items-center justify-between z-40">
          <div className="flex items-center space-x-6">
              <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden text-white"><Menu size={28}/></button>
              <div className="hidden md:flex items-center space-x-3 bg-hemp-900/20 px-4 py-2 rounded-xl border border-hemp-500/30">
                  <div className="h-2 w-2 rounded-full bg-hemp-500 animate-ping"></div>
                  <span className="text-[10px] font-black text-hemp-400 uppercase tracking-[0.4em] font-mono">STATUS: EMERALD_STABLE</span>
              </div>
          </div>

          <div className="flex items-center space-x-6">
              <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-hemp-700 uppercase tracking-widest">System Pulse</span>
                  <div className="text-xs font-bold text-hemp-500 font-mono">v7.0.0_NODE</div>
              </div>
              <button onClick={toggleTheme} className="p-3 rounded-2xl bg-white/5 text-hemp-400 border border-hemp-900/50 transition-all hover:bg-hemp-600 hover:text-white">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,197,94,0.05),_transparent_50%)] pointer-events-none"></div>
          <div className="relative z-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
