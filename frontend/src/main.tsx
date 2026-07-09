import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  window.Telegram.WebApp.setHeaderColor('#0D0B1A');
  window.Telegram.WebApp.setBackgroundColor('#0D0B1A');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
