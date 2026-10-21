import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// V7.14.0-STABLE - PRODUCTION PROTOCOL
const version = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'V7.14.0-STABLE';
const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

console.log(`%c NUCLEUS APP ${version} `, 'background: #006633; color: #fff; font-weight: bold; padding: 10px; font-size: 20px; border: 2px solid #DDDB00;');
console.log(`%c BUILD: ${buildTime} `, 'background: #000; color: #888; font-family: monospace;');

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.update().catch(() => {}));
  }).catch(() => {});
}

// Normalizador automático de rutas directas para escáneres QR móviles
// Si un teléfono abre /trace/:id sin hash, lo reescribe a /#/trace/:id para que HashRouter lo resuelva inmediatamente.
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/trace/')) {
  const targetPath = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', `/#${targetPath}`);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
