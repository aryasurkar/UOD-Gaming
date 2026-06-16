import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import App from './App.jsx'

// Import AOS for scroll animations
import AOS from 'aos';
import 'aos/dist/aos.css';

import './index.css'
import './registerServiceWorker'

// Global PWA installation event listener
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed'));
  console.log('PWA was installed successfully');
});

// Initialize AOS
AOS.init({
  duration: 800,
  easing: 'ease-out-cubic',
  once: true,
  offset: 100,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
