/**
 * main.jsx — Application entry point.
 *
 * Renders the root React tree inside:
 *  1. React.StrictMode — catches common mistakes during development
 *  2. ExotelThemeProvider — applies the Exotel signal design system theme
 *     with dark mode enabled by default
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExotelThemeProvider } from '@exotel-npm-dev/signal-design-system';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ExotelThemeProvider defaultMode="dark">
      <App />
    </ExotelThemeProvider>
  </React.StrictMode>
);
