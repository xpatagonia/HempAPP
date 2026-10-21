import React, { useState } from 'react';
import { Check, X, Download, Smartphone, Monitor, QrCode, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../src/hooks/usePWAInstall';

/** Official Android Robot Head SVG Logo */
export const AndroidLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.523 15.3414C16.971 15.3414 16.523 14.8934 16.523 14.3414C16.523 13.7894 16.971 13.3414 17.523 13.3414C18.075 13.3414 18.523 13.7894 18.523 14.3414C18.523 14.8934 18.075 15.3414 17.523 15.3414ZM6.477 15.3414C5.925 15.3414 5.477 14.8934 5.477 14.3414C5.477 13.7894 5.925 13.3414 6.477 13.3414C7.029 13.3414 7.477 13.7894 7.477 14.3414C7.477 14.8934 7.029 15.3414 6.477 15.3414ZM17.881 10.1584L19.855 6.7394C19.969 6.5414 19.901 6.2884 19.703 6.1744C19.505 6.0604 19.252 6.1284 19.138 6.3264L17.139 9.7884C15.619 9.0954 13.868 8.7044 12 8.7044C10.132 8.7044 8.381 9.0954 6.861 9.7884L4.862 6.3264C4.748 6.1284 4.495 6.0604 4.297 6.1744C4.099 6.2884 4.031 6.5414 4.145 6.7394L6.119 10.1584C2.684 12.0254 0.352 15.5454 0 19.6954H24C23.648 15.5454 21.316 12.0254 17.881 10.1584Z" />
  </svg>
);

/** Official Windows 4-Pane SVG Logo */
export const WindowsLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 3H11.5V11.5H3V3ZM12.5 3H21V11.5H12.5V3ZM3 12.5H11.5V21H3V12.5ZM12.5 12.5H21V21H12.5V12.5Z" />
  </svg>
);

export interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'header' | 'sidebar' | 'login' | 'login-hero';
  isCollapsed?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  variant = 'header',
  isCollapsed = false,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    install,
    downloadWindowsLauncher,
    downloadWindowsShortcut,
  } = usePWAInstall();

  const [activeModalTab, setActiveModalTab] = useState<'android' | 'windows' | 'ios' | null>(null);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [downloadedFile, setDownloadedFile] = useState<string | null>(null);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hempc.com.ar';

  const handleTriggerInstall = async (preferredTab: 'android' | 'windows' | 'ios') => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4500);
        return;
      }
    }
    setActiveModalTab(preferredTab);
  };

  const handleDownloadBat = () => {
    downloadWindowsLauncher();
    setDownloadedFile('HempC_Nucleus_Windows_App.bat');
    setTimeout(() => setDownloadedFile(null), 5000);
  };

  const handleDownloadUrl = () => {
    downloadWindowsShortcut();
    setDownloadedFile('HempC_Nucleus_Escritorio.url');
    setTimeout(() => setDownloadedFile(null), 5000);
  };

  const renderModal = () => {
    if (!activeModalTab) return null;

    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        onClick={() => setActiveModalTab(null)}
      >
        <div
          className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-white animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-[#006633] via-emerald-800 to-slate-900 p-6 text-white relative">
            <button
              type="button"
              onClick={() => setActiveModalTab(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                {activeModalTab === 'android' ? (
                  <AndroidLogo size={28} className="text-[#3DDC84]" />
                ) : activeModalTab === 'windows' ? (
                  <WindowsLogo size={24} className="text-sky-400" />
                ) : (
                  <Smartphone size={26} className="text-emerald-300" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-300 font-black block">
                  Centro Oficial de Descarga • HempC Nucleus
                </span>
                <h3 className="text-xl font-black tracking-tight uppercase italic">
                  {activeModalTab === 'android'
                    ? 'Instalar App en Android'
                    : activeModalTab === 'windows'
                    ? 'App para Windows Escritorio'
                    : 'Instalar en iPhone / iPad'}
                </h3>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-2 mt-5 bg-black/25 p-1.5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveModalTab('android')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  activeModalTab === 'android'
                    ? 'bg-[#3DDC84] text-slate-950 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <AndroidLogo size={16} />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('windows')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  activeModalTab === 'windows'
                    ? 'bg-[#0078D4] text-white shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <WindowsLogo size={14} />
                <span>Windows PC</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('ios')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                  activeModalTab === 'ios'
                    ? 'bg-white text-slate-950 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smartphone size={14} />
                <span>iPhone / iOS</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {activeModalTab === 'android' && (
              <div className="space-y-4">
                {isInstallable && (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <AndroidLogo size={28} className="text-[#006633] dark:text-[#3DDC84] shrink-0" />
                      <div>
                        <p className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-200">
                          Instalador Directo Disponible
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          Instala la aplicación oficial sin pasar por tiendas externas.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setActiveModalTab(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#006633] hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-md cursor-pointer"
                    >
                      Instalar Ahora
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="sm:col-span-2 flex flex-col items-center justify-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}`}
                      alt="Código QR Android HempC"
                      className="w-28 h-28 object-contain"
                    />
                    <span className="mt-2 text-[10px] font-mono font-bold text-slate-600 uppercase flex items-center gap-1">
                      <QrCode size={12} /> Escanear con Android
                    </span>
                  </div>
                  <div className="sm:col-span-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-1.5">
                      <AndroidLogo size={16} className="text-[#3DDC84]" />
                      <span>Pasos en tu Teléfono o Tablet Android:</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p>
                        Abre <strong>Chrome en Android</strong> o escanea el código QR con la cámara de tu celular.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p>
                        Toca el menú de 3 puntos <strong>(⋮)</strong> arriba a la derecha en Chrome.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p>
                        Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-3">
                  <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                  <span>
                    <strong>Modo Campo Offline Activo:</strong> Una vez instalada en Android, podrás registrar monitoreo e inspecciones de lotes aún sin señal en el campo.
                  </span>
                </div>
              </div>
            )}

            {activeModalTab === 'windows' && (
              <div className="space-y-4">
                {/* Direct Download Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/90 via-slate-900 to-slate-900 border border-sky-500/30 text-white space-y-4 shadow-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-[#0078D4] text-white shadow-md shadow-sky-600/30">
                        <WindowsLogo size={24} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-sky-300 font-bold block">
                          Windows 10 / Windows 11 (64-bit)
                        </span>
                        <h4 className="text-base font-black uppercase tracking-tight">
                          Ejecutable de Escritorio HempC Nucleus
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Descarga el lanzador oficial para abrir <strong>HempC Nucleus</strong> como una ventana nativa independiente en tu PC Windows (sin pestañas ni barra de navegador), o instala la App Web Progresiva directamente.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadBat}
                      className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#0078D4] hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-sky-950/50 transition transform active:scale-95 cursor-pointer"
                    >
                      <Download size={16} />
                      <span>Descargar App (.BAT)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadUrl}
                      className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-black text-xs uppercase tracking-wider transition transform active:scale-95 cursor-pointer"
                    >
                      <Monitor size={16} className="text-sky-300" />
                      <span>Acceso Directo (.URL)</span>
                    </button>
                  </div>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setActiveModalTab(null);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
                    >
                      <Sparkles size={15} />
                      <span>Instalar PWA Nativa en Windows (1 Clic)</span>
                    </button>
                  )}

                  {downloadedFile && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      <span>
                        ¡Descargado <strong>{downloadedFile}</strong>! Guárdalo en tu Escritorio de Windows y haz doble clic para abrir la aplicación.
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions for Browser Bar Install */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Monitor size={15} className="text-[#0078D4]" />
                    <span>Cómo anclar al Menú Inicio y Barra de Tareas de Windows:</span>
                  </p>
                  <ol className="space-y-2 list-decimal list-inside">
                    <li>
                      Si descargaste <strong>HempC_Nucleus_Windows_App.bat</strong>, colócalo en tu <strong>Escritorio</strong> y ejecútalo con doble clic: abrirá la plataforma en ventana exclusiva de aplicación.
                    </li>
                    <li>
                      También puedes hacer clic en el ícono de <strong>Instalar aplicación</strong> (monitor con flecha) a la derecha de la barra de direcciones de <strong>Microsoft Edge</strong> o <strong>Google Chrome</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {activeModalTab === 'ios' && (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p>
                    Abre la plataforma desde <strong>Safari</strong> en tu iPhone o iPad y toca el botón <strong>Compartir</strong> (cuadrado con flecha hacia arriba).
                  </p>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p>
                    Desliza hacia abajo en el menú y selecciona <strong>"Agregar a Inicio"</strong> (Add to Home Screen).
                  </p>
                </div>
                <div className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center shrink-0">
                    3
                  </span>
                  <p>
                    Confirma pulsando <strong>"Agregar"</strong> arriba a la derecha para tener el ícono oficial en tu pantalla.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">
              HempC Nucleus • PWA & Desktop v7.13.0
            </span>
            <button
              type="button"
              onClick={() => setActiveModalTab(null)}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Toast notification when native PWA installation succeeds
  const renderSuccessToast = () => {
    if (!installSuccess) return null;
    return (
      <div className="fixed bottom-6 right-6 z-[110] flex items-center gap-2.5 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-wider border border-emerald-400 animate-bounce">
        <Check size={18} />
        <span>¡Aplicación HempC instalada con éxito en tu dispositivo!</span>
      </div>
    );
  };

  // 1. SIDEBAR VARIANT
  if (variant === 'sidebar') {
    if (isCollapsed) {
      return (
        <>
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleTriggerInstall('android')}
              title="Instalar App Android"
              className="flex items-center justify-center h-11 w-11 mx-auto rounded-2xl bg-[#3DDC84]/15 hover:bg-[#3DDC84]/25 text-emerald-700 dark:text-[#3DDC84] border border-[#3DDC84]/40 transition-all relative group cursor-pointer"
            >
              <AndroidLogo size={20} />
              <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Instalar App Android
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTriggerInstall('windows')}
              title="Descargar App Windows Escritorio"
              className="flex items-center justify-center h-11 w-11 mx-auto rounded-2xl bg-[#0078D4]/15 hover:bg-[#0078D4]/25 text-[#0078D4] dark:text-sky-400 border border-[#0078D4]/40 transition-all relative group cursor-pointer"
            >
              <WindowsLogo size={17} />
              <div className="absolute left-full ml-3 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                App Windows Escritorio
              </div>
            </button>
          </div>
          {renderModal()}
          {renderSuccessToast()}
        </>
      );
    }

    return (
      <>
        <div className="pt-2 space-y-2">
          <div className="px-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">
            Descargar Aplicaciones
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTriggerInstall('android')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-emerald-950/90 hover:bg-emerald-900 text-white border border-[#3DDC84]/40 shadow-sm transition-all cursor-pointer group"
              title="Instalar App Oficial para Android"
            >
              <AndroidLogo size={17} className="text-[#3DDC84] group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left leading-tight">
                <span className="block text-[9px] uppercase tracking-wider text-[#3DDC84] font-mono font-bold">
                  App Móvil
                </span>
                <span className="block text-xs font-black tracking-tight">Android</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerInstall('windows')}
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-sky-500/40 shadow-sm transition-all cursor-pointer group"
              title="Descargar App de Escritorio para Windows PC"
            >
              <WindowsLogo size={15} className="text-[#0078D4] dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left leading-tight">
                <span className="block text-[9px] uppercase tracking-wider text-sky-400 font-mono font-bold">
                  Escritorio
                </span>
                <span className="block text-xs font-black tracking-tight">Windows</span>
              </div>
            </button>
          </div>
        </div>
        {renderModal()}
        {renderSuccessToast()}
      </>
    );
  }

  // 2. LOGIN FORM VARIANT (Visible on all screens in the login panel)
  if (variant === 'login') {
    return (
      <>
        <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              Instalación Directa en Dispositivos
            </span>
            {isInstalled && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Check size={12} /> App Instalada
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleTriggerInstall('android')}
              className="flex items-center justify-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 text-white border border-[#3DDC84]/40 transition-all shadow-sm active:scale-95 cursor-pointer group"
            >
              <AndroidLogo size={20} className="text-[#3DDC84] group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left">
                <span className="block text-[9px] font-mono uppercase tracking-wider text-[#3DDC84] font-bold leading-none">
                  Instalar App
                </span>
                <span className="block text-xs font-black tracking-tight mt-0.5">
                  Android APK / PWA
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerInstall('windows')}
              className="flex items-center justify-center gap-2.5 px-3.5 py-3 rounded-xl bg-[#0078D4] hover:bg-sky-600 text-white border border-sky-400/30 transition-all shadow-sm active:scale-95 cursor-pointer group"
            >
              <WindowsLogo size={17} className="text-white group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left">
                <span className="block text-[9px] font-mono uppercase tracking-wider text-sky-100 font-bold leading-none">
                  Descargar PC
                </span>
                <span className="block text-xs font-black tracking-tight mt-0.5">
                  App Windows
                </span>
              </div>
            </button>
          </div>
        </div>
        {renderModal()}
        {renderSuccessToast()}
      </>
    );
  }

  // 3. HEADER VARIANT (Default)
  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Botón Android con logo oficial */}
        <button
          type="button"
          onClick={() => handleTriggerInstall(isIOS ? 'ios' : 'android')}
          title="Instalar App en Android / Teléfono"
          className="flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-950/90 dark:hover:bg-emerald-900 text-white px-3 py-2 text-xs font-black shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-[#3DDC84]/40 cursor-pointer"
        >
          <AndroidLogo size={16} className="text-[#3DDC84] shrink-0" />
          <span className="hidden xl:inline">Instalar Android</span>
          <span className="xl:hidden">Android</span>
        </button>

        {/* Botón Windows Escritorio con logo oficial */}
        <button
          type="button"
          onClick={() => handleTriggerInstall('windows')}
          title="Descargar o Instalar App para Windows Escritorio"
          className="flex items-center gap-2 rounded-2xl bg-[#0078D4] hover:bg-sky-600 text-white px-3 py-2 text-xs font-black shadow-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-sky-400/30 cursor-pointer"
        >
          <WindowsLogo size={14} className="text-white shrink-0" />
          <span className="hidden xl:inline">App Windows</span>
          <span className="xl:hidden">Windows</span>
        </button>
      </div>
      {renderModal()}
      {renderSuccessToast()}
    </>
  );
};

