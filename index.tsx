
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V300 - OPERATION CRIMSON
// @ts-ignore
const buildTime = process.env.BUILD_TIME || 'UNKNOWN';
console.log(`%c NUCLEUS APP V300 (CRIMSON) LOADED `, 'background: #7f1d1d; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px; font-size: 14px; border: 1px solid #dc2626;');
console.log(`%c BUILD TIME: ${buildTime} `, 'background: #000; color: #f87171; font-family: monospace;');

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
