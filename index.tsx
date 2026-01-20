
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// CACHE BUSTER V54 - PROJECT BLUE BOOK
console.log('%c NUCLEUS APP V54 (BLUE BOOK) SYSTEM LINK RESTORED ', 'background: #2563eb; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;');

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
