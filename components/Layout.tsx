
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  LayoutDashboard, Sprout, ClipboardList, Menu, X, Leaf, LogOut, 
  UserCircle, Users, Settings, Calendar, Sun, Moon, ScanBarcode, 
  Tractor, BookOpen, Clock, Bot, ChevronRight, Sparkles, Shield, Cpu
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, label, highlight = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 ${
        isActive ? 'bg-hemp-600 text-white shadow-[0_0_30px_rgba(22,163,74,0.4)]' : 
        highlight ? 'text-purple-400 hover:bg-purple-900/20' : 'text-slate-500 hover:text-hemp-400 hover:bg-white/5'
      }`}>
      <Icon size={20} className={isActive ? 'animate-pulse' : ''} />
      <span className="font-bold tracking-tight text-sm">{label}</span>
      {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, theme, toggleTheme } = useAppContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  if (!currentUser) return <div className="bg-[#010402] min-h-screen">{children}</div>;

  return (
    <div className="flex h-screen bg-[#010402] text-slate-200 font-sans overflow-hidden">
      {/* SIDEBAR v6.0 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#050c06] border-r border-hemp-900/30 flex flex-col transition-transform duration-500 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-24 flex items-center px-8 relative">
          <div className="neural-line opacity-50"></div>
          <div className="flex items-center space-x-3">
             <div className="bg-hemp-600 p-2.5 rounded-2xl shadow-[0_0_20px_rgba(22,163,74,0.4)] animate-pulse"><Leaf className="text-white" size={24} /></div>
             <span className="text-2xl font-black tracking-tighter text-white uppercase italic">HEMP<span className="text-hemp-500">C</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-6 text-[10px] font-black text-hemp-800 uppercase tracking-[0.4em] mb-4">Master Console</p>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/advisor" icon={Cpu} label="HempAI v6.0" highlight={true} />
          
          <div className="pt-8">
              <p className="px-6 text-[10px] font-black text-hemp-800 uppercase tracking-[0.4em] mb-4">Operations</p>
              <NavItem to="/locations" icon={Tractor} label="Campos" />
              <NavItem to="/plots" icon={Sprout} label="Unidades" />
              <NavItem to="/calendar" icon={Calendar} label="Planilla Temporal" />
          </div>

          <div className="pt-8">
              <p className="px-6 text-[10px] font-black text-hemp-800 uppercase tracking-[0.4em] mb-4">Data Vault</p>
              <NavItem to="/seed-batches" icon={ScanBarcode} label="Logística" />
              <NavItem to="/varieties" icon={BookOpen} label="Genética" />
          </div>
        </nav>

        <div className="p-6 border-t border-hemp-900/30 bg-black/40">
           <div className="flex items-center space-x-4 mb-6">
               <div className="h-12 w-12 rounded-2xl bg-hemp-600 flex items-center justify-center text-white shadow-lg"><UserCircle size={28} /></div>
               <div className="flex-1 min-w-0">
                   <p className="text-sm font-black text-white truncate">{currentUser.name}</p>
                   <p className="text-[10px] text-hemp-500 font-bold font-mono uppercase tracking-widest">SYSTEM_ADMIN</p>
               </div>
           </div>
           <button onClick={logout} className="w-full flex items-center justify-center space-x-2 text-[10px] text-red-500 hover:bg-red-500/10 p-4 rounded-2xl transition-all font-black uppercase tracking-[0.2em] border border-red-500/20">
               <LogOut size={16} /> <span>Abort Session</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 bg-[#050c06]/80 backdrop-blur-2xl border-b border-hemp-900/30 px-10 flex items-center justify-between z-40 relative">
          <div className="neural-line opacity-30"></div>
          <div className="flex items-center space-x-4">
              <button onClick={() => setIsMobileOpen(!isMobileOpen)} className="lg:hidden text-white"><Menu size={28}/></button>
              <div className="flex items-center space-x-3 bg-hemp-900/20 px-4 py-2 rounded-xl border border-hemp-500/30">
                  <div className="h-2 w-2 rounded-full bg-hemp-500 animate-ping"></div>
                  <span className="text-[10px] font-black text-hemp-400 uppercase tracking-[0.4em] font-mono">CORE_SYNC: ACTIVE</span>
              </div>
          </div>

          <div className="flex items-center space-x-6">
              <div className="hidden md:flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">System Pulse</span>
                  <div className="flex items-center text-xs font-bold text-hemp-500 font-mono">v6.0.1_STABLE</div>
              </div>
              <button onClick={toggleTheme} className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-hemp-400 border border-white/10 transition-all">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-12 bg-gradient-to-br from-[#010402] to-[#020a04]">
          {children}
        </div>
      </main>
    </div>
  );
}
