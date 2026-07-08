import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Aggressively clear Service Workers and Cache Storage to prevent stale preview issues in AI Studio
if ('serviceWorker' in navigator) {
  // Clear any existing Cache Storage
  if (window.caches) {
    caches.keys().then(names => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }

  // Unregister all Service Workers
  navigator.serviceWorker.getRegistrations().then(registrations => {
    let unregistered = false;
    for (const registration of registrations) {
      registration.unregister();
      unregistered = true;
      console.log('SW unregistered to prevent stale cache in preview.');
    }
    // If a service worker was unregistered, force reload to apply fresh files from network
    if (unregistered) {
      console.log('Stale Service Worker removed. Reloading...');
      window.location.reload();
    }
  });
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
