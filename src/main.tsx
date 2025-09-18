import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Set up app loaded indicator for E2E tests
document.addEventListener('DOMContentLoaded', () => {
  const appLoadedIndicator = document.createElement('div');
  appLoadedIndicator.setAttribute('data-testid', 'app-loaded');
  appLoadedIndicator.style.display = 'none';
  document.body.appendChild(appLoadedIndicator);
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);