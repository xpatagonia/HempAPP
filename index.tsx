
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V52 - FORCE UPDATE
console.log('%c NUCLEUS APP V52 BOOT SEQUENCE INITIATED ', 'background: #7e22ce; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;');

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
