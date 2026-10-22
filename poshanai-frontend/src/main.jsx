import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App.jsx';
import { ToastProvider } from './components/common/index.js';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import { store } from './store/index.js';
import 'pixel-retroui/dist/index.css';
import 'pixel-retroui/dist/fonts.css';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
