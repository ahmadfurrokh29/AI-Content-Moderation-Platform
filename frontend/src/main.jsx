// Entry point of the React app.
// Mounts the entire app into the <div id="root"> in index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';

// StrictMode: highlights potential problems in development (runs effects twice to catch bugs)
// BrowserRouter: enables client-side routing so page doesn't reload on URL change
// Toaster: global toast notification container — any component can call toast() anywhere
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </StrictMode>
);
