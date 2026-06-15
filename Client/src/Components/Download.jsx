import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download as DownloadIcon, Monitor, Smartphone, Shield, Zap, WifiOff, Check } from 'lucide-react';
import '../Css/Download.css';
import Foote from './Foote';

const Downloader = () => {
  const [installPrompt, setInstallPrompt] = useState(window.deferredPrompt || null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleInstallPromptAvailable = () => {
      setInstallPrompt(window.deferredPrompt);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };
    
    window.addEventListener('pwa-install-available', handleInstallPromptAvailable);
    window.addEventListener('pwa-installed', handleAppInstalled);
    
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }
    
    return () => {
      window.removeEventListener('pwa-install-available', handleInstallPromptAvailable);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      if (isInstalled) {
        alert('UOD Gaming is already installed on this device!');
      } else {
        alert('PWA installation is not automatically triggered by your browser. Please use your browser menu (e.g. "Add to Home Screen" or the install icon in the URL bar) to download the app.');
      }
      return;
    }
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  const features = [
    {
      icon: WifiOff,
      title: "Play 100% Offline",
      desc: "Install once and play Snake, Tic Tac Toe, or Color Guesser anywhere, anytime, without an active internet connection."
    },
    {
      icon: Zap,
      title: "Instant Launch & Load",
      desc: "Zero loading screens or server wait times. Cached assets load instantly from local storage for smooth, responsive gameplay."
    },
    {
      icon: Monitor,
      title: "Standalone Display",
      desc: "Run in standalone window mode. Removes browser url bar, borders, tabs, and limits distractions for full gaming immersion."
    },
    {
      icon: Shield,
      title: "Safe & Secure",
      desc: "Installs directly via standard browser sandbox APIs. Safe, lightweight (under 2MB), and never accesses your private files."
    }
  ];

  return (
    <div className="download-page-wrapper">
      <div className="download-hero">
        <div className="hero-particles">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="download-particle"
              animate={{
                y: [0, -40, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="container">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title text-gaming">
              <DownloadIcon className="title-icon animate-bounce" />
              Download UOD Gaming
            </h1>
            <p className="hero-subtitle">
              Bring the ultimate arcade experience directly to your desktop or mobile. Play offline, lag-free, and in pure fullscreen standalone mode!
            </p>

            <div className="cta-container">
              {isInstalled ? (
                <div className="installed-badge">
                  <Check size={20} />
                  <span>Installed & Ready to Play</span>
                </div>
              ) : (
                <motion.button 
                  className="btn-install-large"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstallClick}
                >
                  <DownloadIcon size={24} />
                  <span>{installPrompt ? 'Install Gaming App' : 'Get Desktop App'}</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Install Locally?</h2>
          <div className="features-grid">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div 
                  key={index} 
                  className="feat-card"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  whileHover={{ y: -8 }}
                >
                  <div className="feat-icon-wrapper">
                    <Icon size={28} />
                  </div>
                  <h3 className="feat-title">{feat.title}</h3>
                  <p className="feat-desc">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="guide-section">
        <div className="container">
          <h2 className="section-title">Installation Instructions</h2>
          <div className="guide-grid">
            <div className="guide-card">
              <div className="device-type">
                <Monitor size={24} />
                <h3>Desktop (Chrome / Edge / Opera)</h3>
              </div>
              <ol className="instructions-list">
                <li>Open this site in a supported browser (Chrome, Edge).</li>
                <li>Click the <strong>"Install App"</strong> button in our navigation header, or on this page.</li>
                <li>Alternatively, click the <strong>Install icon</strong> (small desktop computer with a down arrow) on the right side of the browser's address bar.</li>
                <li>Confirm the installation prompt to add UOD Gaming to your desktop or applications folder.</li>
              </ol>
            </div>

            <div className="guide-card">
              <div className="device-type">
                <Smartphone size={24} />
                <h3>Mobile & Tablet (Android / iOS)</h3>
              </div>
              <ol className="instructions-list">
                <li>
                  <strong>iOS / Safari:</strong> Tap the <strong>Share</strong> button (box with up arrow) in the Safari bottom bar, then scroll down and select <strong>"Add to Home Screen"</strong>.
                </li>
                <li>
                  <strong>Android / Chrome:</strong> Tap the **Download** button on this page, or click the **three dots menu** at the top right of Chrome and select <strong>"Install app"</strong>.
                </li>
                <li>An app icon will be added to your mobile home screen for quick, offline launch.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <Foote />
    </div>
  );
};

export default Downloader;