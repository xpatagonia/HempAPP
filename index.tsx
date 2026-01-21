
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V101 - OPERATION BLUE PROTOCOL
// @ts-ignore
const buildTime = process.env.BUILD_TIME || 'UNKNOWN';
console.log(`%c NUCLEUS APP V101 (BLUE) LOADED `, 'background: #2563eb; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px; font-size: 14px;');
console.log(`%c BUILD TIME: ${buildTime} `, 'background: #333; color: #60a5fa; font-family: monospace;');

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
