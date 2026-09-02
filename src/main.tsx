import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { initMobileBridge } from './utils/mobileBridge.js';
import './index.css';

initMobileBridge();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
