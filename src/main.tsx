import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 1. Parse and initialize environment mode
const params = new URLSearchParams(window.location.search);
const envParam = params.get('env');
if (envParam === 'testing' || envParam === 'production') {
  localStorage.setItem('kopran_env_mode', envParam);
} else if (!localStorage.getItem('kopran_env_mode')) {
  localStorage.setItem('kopran_env_mode', 'production');
}

// 2. Intercept fetch to automatically attach environment header safely
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    value: async function (input: RequestInfo | URL, init?: RequestInit) {
      const envMode = localStorage.getItem('kopran_env_mode') || 'production';
      const modifiedInit = { ...(init || {}) };
      const headers = new Headers(modifiedInit.headers || {});
      headers.set('X-Env-Mode', envMode);

      const savedUser = localStorage.getItem('shift_sync_user');
      if (savedUser) {
        try {
          const userObj = JSON.parse(savedUser);
          if (userObj && userObj.mobile) {
            headers.set('X-User-Mobile', userObj.mobile);
          }
        } catch {
          // ignore parsing error
        }
      }

      modifiedInit.headers = headers;
      return originalFetch(input, modifiedInit);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Direct window.fetch override failed. Attempting globalThis patch:", e);
  try {
    const originalFetch = globalThis.fetch;
    Object.defineProperty(globalThis, 'fetch', {
      value: async function (input: RequestInfo | URL, init?: RequestInit) {
        const envMode = localStorage.getItem('kopran_env_mode') || 'production';
        const modifiedInit = { ...(init || {}) };
        const headers = new Headers(modifiedInit.headers || {});
        headers.set('X-Env-Mode', envMode);

        const savedUser = localStorage.getItem('shift_sync_user');
        if (savedUser) {
          try {
            const userObj = JSON.parse(savedUser);
            if (userObj && userObj.mobile) {
              headers.set('X-User-Mobile', userObj.mobile);
            }
          } catch {
            // ignore parsing error
          }
        }

        modifiedInit.headers = headers;
        return originalFetch(input, modifiedInit);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (err) {
    console.error("Could not patch fetch globally:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
