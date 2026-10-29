import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone mode (already installed as PWA or TWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Detect OS & environment
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    setIsWindows(/win/.test(userAgent) || /windows/.test(userAgent));

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  /**
   * Generates and downloads a standalone Windows Desktop App Launcher (.bat)
   * that opens HempC Nucleus in native-like Edge/Chrome --app window mode
   * (without browser tabs or address bar).
   */
  const downloadWindowsLauncher = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hempc.com.ar';
    const batContent = [
      '@echo off',
      'title HempC Nucleus - Estacion de Escritorio Windows',
      'color 0A',
      'echo ==========================================================',
      'echo   HEMPC NUCLEUS - RED COOPERATIVA DE CANAMO INDUSTRIAL',
      'echo   Iniciando Aplicacion de Escritorio para Windows...',
      'echo ==========================================================',
      'set "APP_URL=' + appUrl + '"',
      '',
      'REM Intentar abrir en modo App Nativa con Microsoft Edge (preinstalado en Windows 10/11)',
      'start "" msedge --app="%APP_URL%" 2>nul',
      'if %errorlevel% equ 0 exit',
      '',
      'REM Alternativa con Google Chrome en modo App Nativa',
      'start "" chrome --app="%APP_URL%" 2>nul',
      'if %errorlevel% equ 0 exit',
      '',
      'REM Respaldo en navegador predeterminado',
      'start "" "%APP_URL%"',
      'exit',
    ].join('\r\n');

    const blob = new Blob([batContent], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HempC_Nucleus_Windows_App.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Generates and downloads a standard Windows Internet Shortcut (.url)
   * that can be placed directly on the Windows Desktop.
   */
  const downloadWindowsShortcut = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hempc.com.ar';
    const urlContent = [
      '[InternetShortcut]',
      `URL=${appUrl}`,
      `IconFile=${appUrl}/favicon.ico`,
      'IconIndex=0',
      'HotKey=0',
      'IDList=',
    ].join('\r\n');

    const blob = new Blob([urlContent], { type: 'application/internet-shortcut' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HempC_Nucleus_Escritorio.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isWindows,
    isInIframe,
    install,
    downloadWindowsLauncher,
    downloadWindowsShortcut,
  };
}

