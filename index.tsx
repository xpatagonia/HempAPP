
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V55 - OPERATION CYAN STORM
// @ts-ignore
const buildTime = process.env.BUILD_TIME || 'UNKNOWN';
console.log(`%c NUCLEUS APP V55 (CYAN) LOADED `, 'background: #06b6d4; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;');
console.log(`%c BUILD TIME: ${buildTime} `, 'background: #333; color: #06b6d4; font-family: monospace;');

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
