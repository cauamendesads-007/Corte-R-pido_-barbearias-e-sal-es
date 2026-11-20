/**
 * Ponto de entrada da aplicação Corte Rápido.
 * Configura React, React Router, providers globais e registra Service Worker.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './estilos/globals.css';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Erro ao registrar Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);