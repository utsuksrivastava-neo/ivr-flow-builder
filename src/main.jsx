/**
 * main.jsx — Application entry point.
 * Initializes the theme store (applies data-theme attribute) before rendering.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ExotelThemeProvider } from '@exotel-npm-dev/signal-design-system';
import useThemeStore from './store/themeStore';
import App from './App';
import './App.css';

/**
 * Wrapper that keeps ExotelThemeProvider in sync with the Zustand theme store.
 */
function ThemedApp() {
  const mode = useThemeStore((s) => s.mode);
  return (
    <ExotelThemeProvider defaultMode={mode}>
      <App />
    </ExotelThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemedApp />
  </React.StrictMode>
);
