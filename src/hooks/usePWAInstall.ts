import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __hempcDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__hempcDeferredPrompt) {
      return window.__hempcDeferredPrompt;
    }
    return null;
  });
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

    if (window.__hempcDeferredPrompt) {
      setDeferredPrompt(window.__hempcDeferredPrompt);
    }

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
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__hempcDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleCustomPromptReady = () => {
      if (window.__hempcDeferredPrompt) {
        setDeferredPrompt(window.__hempcDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__hempcDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('hempc:pwa-prompt-ready', handleCustomPromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('hempc:pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const activePrompt = deferredPrompt || (typeof window !== 'undefined' ? window.__hempcDeferredPrompt : null);
    if (!activePrompt) return false;
    await activePrompt.prompt();
    const { outcome } = await activePrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      if (typeof window !== 'undefined') {
        window.__hempcDeferredPrompt = null;
      }
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  /**
   * Generates and downloads a standalone Windows Desktop App Installer & Launcher (.bat)
   * that automatically downloads the official high-DPI HempC brand icon (hempc-icon.ico),
   * creates a native Windows Desktop & Start Menu Shortcut ("HempC Nucleus.lnk") with the
   * official HempC icon, and launches HempC Nucleus in native Edge/Chrome --app window mode.
   */
  const downloadWindowsLauncher = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hempc.com.ar';
    const batContent = [
      '@echo off',
      'title HempC Nucleus - Instalador y Lanzador Oficial Windows',
      'color 0A',
      'echo ==========================================================',
      'echo   HEMPC NUCLEUS - RED COOPERATIVA DE CANAMO INDUSTRIAL',
      'echo   Configurando Icono Oficial HempC en Escritorio Windows...',
      'echo ==========================================================',
      'set "APP_URL=' + appUrl + '"',
      'set "ICON_URL=' + appUrl + '/hempc-icon.ico?v=7.46.0"',
      'set "APP_DIR=%LOCALAPPDATA%\\HempC_Nucleus"',
      'set "ICON_PATH=%APP_DIR%\\hempc-icon.ico"',
      'if not exist "%APP_DIR%" mkdir "%APP_DIR%"',
      '',
      'REM Descargar icono oficial multi-resolucion HempC (.ico)',
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri \'%ICON_URL%\' -OutFile \'%ICON_PATH%\' -UseBasicParsing -TimeoutSec 10 } catch {}"',
      '',
      'REM Crear Acceso Directo Nativo en Escritorio y Menu Inicio con el Icono Oficial HempC',
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $ws = New-Object -ComObject WScript.Shell; $desk = [Environment]::GetFolderPath(\'Desktop\'); $sm = [Environment]::GetFolderPath(\'Programs\'); $edge = \'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe\'; if (-not (Test-Path $edge)) { $edge = \'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe\' }; foreach ($dir in @($desk, $sm)) { $lnk = $ws.CreateShortcut((Join-Path $dir \'HempC Nucleus.lnk\')); if (Test-Path $edge) { $lnk.TargetPath = $edge; $lnk.Arguments = \'--app=\' + \'%APP_URL%\' } else { $lnk.TargetPath = \'%APP_URL%\' }; if (Test-Path \'%ICON_PATH%\') { $lnk.IconLocation = \'%ICON_PATH%,0\' }; $lnk.Description = \'HempC Nucleus - Plataforma de Trazabilidad Agro 4.0\'; $lnk.Save() } } catch {}"',
      '',
      'REM Abrir en modo App Nativa con Microsoft Edge (preinstalado en Windows 10/11)',
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
   * configured with the official HempC multi-size .ico file.
   */
  const downloadWindowsShortcut = () => {
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://hempc.com.ar';
    const urlContent = [
      '[InternetShortcut]',
      `URL=${appUrl}`,
      `IconFile=${appUrl}/hempc-icon.ico`,
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


