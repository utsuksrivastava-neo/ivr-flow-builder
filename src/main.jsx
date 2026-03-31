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
