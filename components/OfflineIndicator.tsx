import React, { useState } from 'react';
import { Wifi, WifiOff, Cloud, HardDrive, Check, X } from 'lucide-react';
import { useOnlineStatus } from '../src/hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showDismissed, setShowDismissed] = useState(false);

  if (isOnline) {
    return (
      <div 
        title="Conexión en línea activa: datos sincronizados en tiempo real con Supabase"
        className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-xs font-semibold"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <Wifi size={13} />
        <span>En línea</span>
      </div>
    );
  }

  if (showDismissed) {
    return (
      <button 
        onClick={() => setShowDismissed(false)}
        title="Modo Campo Offline activo: haz clic para ver detalles"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse"
      >
        <WifiOff size={13} />
        <span>Offline</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-2xl bg-slate-900 border-2 border-amber-500/60 p-3.5 shadow-2xl text-white animate-slideUp">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
            <WifiOff size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Modo Campo Offline</h4>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-mono font-bold">Local</span>
            </div>
            <p className="mt-1 text-xs text-slate-300 leading-snug">
              Sin señal 4G/WiFi en el lote. Los datos, firmas y protocolos se guardan en el almacenamiento local y se sincronizarán al recuperar conexión.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg"
          title="Minimizar aviso"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
