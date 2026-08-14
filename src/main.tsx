import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign third-party script errors (e.g. ad networks/CPX CDN load blocks)
const originalOnError = window.onerror;
window.onerror = function (message, source, lineno, colno, error) {
  const msgStr = typeof message === 'string' ? message : '';
  if (
    msgStr === 'Script error.' || 
    msgStr.includes('Script error') ||
    msgStr.includes('cpx') ||
    msgStr.includes('general_config') ||
    source?.includes('cpx-research')
  ) {
    console.warn('[Global Suppressor] Suppressed external cross-origin script error:', message);
    return true; // Prevents default browser error overlay for CORS script errors
  }
  if (originalOnError) {
    return originalOnError.call(window, message, source, lineno, colno, error);
  }
  return false;
};

window.addEventListener('error', (event) => {
  if (
    event.message === 'Script error.' || 
    event.message?.includes('cpx') || 
    event.filename?.includes('cpx-research')
  ) {
    console.warn('[Global Error Filter] Suppressed cross-origin script error:', event.message);
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('offline') || 
    event.reason?.message?.includes('network') ||
    event.reason?.message?.includes('firestore')
  ) {
    console.warn('[Global Promise Filter] Network/Firebase notice:', event.reason?.message || event.reason);
    event.preventDefault();
  }
});

// Register PWA Service Worker for offline support & app installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
      },
      (err) => {
        console.log('[PWA] ServiceWorker registration failed:', err);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

