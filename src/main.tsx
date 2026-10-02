import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { initMobileBridge } from './utils/mobileBridge.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { LanguageProvider } from './i18n/index.js';
import './index.css';

initMobileBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
