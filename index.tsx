
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V200 - OPERATION BLACKOUT
// @ts-ignore
const buildTime = process.env.BUILD_TIME || 'UNKNOWN';
console.log(`%c NUCLEUS APP V200 (BLACKOUT) LOADED `, 'background: #000000; color: #00ff00; font-weight: bold; padding: 4px; border-radius: 4px; font-size: 14px; border: 1px solid #00ff00;');
console.log(`%c BUILD TIME: ${buildTime} `, 'background: #111; color: #aaa; font-family: monospace;');

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
