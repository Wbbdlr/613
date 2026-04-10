import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DisplayProvider } from './contexts/DisplayContext.jsx';

// Global CSS custom properties (themes, font scaling, body reset)
import './index.css';

// Self-hosted fonts — no external network requests
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/700.css';

// Global print styles for window.print() / Save as PDF
import './print.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <DisplayProvider>
        <App />
      </DisplayProvider>
    </AuthProvider>
  </BrowserRouter>
);
