
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V100 - OPERATION ORANGE HORIZON
// @ts-ignore
const buildTime = process.env.BUILD_TIME || 'UNKNOWN';
console.log(`%c NUCLEUS APP V100 (ORANGE) LOADED `, 'background: #ea580c; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px; font-size: 14px;');
console.log(`%c BUILD TIME: ${buildTime} `, 'background: #333; color: #fb923c; font-family: monospace;');

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
