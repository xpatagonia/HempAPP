import React, { useState } from 'react';
import { DownloadCloud, Smartphone, Check, X, Info } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running as an installed standalone PWA, render a clean badge or null
  if (isInstalled) {
    return (
      <div 
        title="App instalada en este dispositivo"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"
      >
        <Check size={14} className="text-emerald-400" />
        {!compact && <span>App Instalada</span>}
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <>
        <button
          onClick={async () => {
            const success = await install();
            if (success) {
              setInstallSuccess(true);
              setTimeout(() => setInstallSuccess(false), 4000);
            }
          }}
          title="Instalar HempC en tu celular, tablet o PC"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 text-xs font-bold shadow-md shadow-emerald-900/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/30"
        >
          <Smartphone size={15} className="animate-pulse" />
          <span>{compact ? 'Instalar' : 'Instalar en Teléfono / Tablet'}</span>
        </button>

        {installSuccess && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-bold text-sm border border-emerald-400 animate-bounce">
            <Check size={18} />
            ¡App instalada con éxito en tu dispositivo!
          </div>
        )}
      </>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar HempC en iPhone o iPad"
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-900/50 transition shadow-sm"
        >
          <Smartphone size={14} />
          <span>{compact ? 'iOS' : 'Instalar en iPhone / iPad'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl text-white">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-black">
                  <Smartphone size={20} />
                  <span>Instalar en iPhone / iPad</span>
                </div>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">1</span>
                  <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra de Safari.</span>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">2</span>
                  <span>Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> (Add to Home Screen).</span>
                </div>
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-2xl">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">3</span>
                  <span>Confirma tocando <strong>"Agregar"</strong> en la esquina superior derecha.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-sm font-black text-white shadow-lg transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for desktop or browsers before event fires
  return (
    <button
      onClick={() => {
        // Fallback message showing how to install from browser address bar
        alert('Para instalar en este dispositivo: Haz clic en el ícono de instalación en la barra de direcciones de tu navegador, o abre el menú de opciones (⋮) y elige "Instalar HempC".');
      }}
      title="Instalar App en el dispositivo"
      className="flex items-center gap-1.5 rounded-xl border border-slate-700 hover:border-emerald-500/40 bg-slate-800/50 hover:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white transition"
    >
      <DownloadCloud size={14} className="text-emerald-400" />
      <span>{compact ? 'App' : 'Instalar App'}</span>
    </button>
  );
};
