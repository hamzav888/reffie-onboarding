import React from 'react';
import ReactDOM from 'react-dom/client';

// One-time migration: remove Phase 1 localStorage key now that data lives in the backend.
localStorage.removeItem('reffie-onboarding-v2');

// Auth state migration: pre-Phase-2 users have a persisted session without a token.
// Clear it so they're forced to re-authenticate (which will capture the token).
try {
  const raw = localStorage.getItem('reffie-auth-v1');
  if (raw) {
    const parsed = JSON.parse(raw);
    if (!parsed?.state?.token) {
      localStorage.removeItem('reffie-auth-v1');
    }
  }
} catch {
  localStorage.removeItem('reffie-auth-v1');
}

console.log('[reffie] API base URL:', import.meta.env.VITE_API_BASE_URL || '(unset — falling back to localhost)');
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
