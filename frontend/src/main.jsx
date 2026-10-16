// src/main.jsx
import './App.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './component/authcontext'; // ✅ Import AuthProvider
import { SocketProvider } from './component/socketcontext';
import { ToastProvider } from './component/ToastContext';
import { ThemeProvider } from './component/themecontext';
import { BackgroundProvider } from './component/backgroundcontext';
import './utils/axiosSetup';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
       <ThemeProvider>
        <AuthProvider>
          <BackgroundProvider>
            <SocketProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </SocketProvider>
          </BackgroundProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);