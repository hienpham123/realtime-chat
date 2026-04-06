import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

const rootEl = document.getElementById('root');

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!rootEl) {
  throw new Error('Root element #root not found');
}

if (!url || !key) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f8f9fa;color:#191c1d;">
      <div style="max-width:420px;padding:24px;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(25,28,29,.06);">
        <h1 style="margin:0 0 8px;font-size:1.25rem;">Configure Supabase</h1>
        <p style="margin:0;font-size:0.875rem;color:#64748b;line-height:1.5;">
          Copy <code style="background:#f1f5f9;padding:2px 6px;border-radius:6px;">.env.example</code> to <code style="background:#f1f5f9;padding:2px 6px;border-radius:6px;">.env</code> and set <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong>, then restart the dev server.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
