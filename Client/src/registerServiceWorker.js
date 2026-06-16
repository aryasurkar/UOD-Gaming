import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      if (confirm('New content available. Reload to update?')) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log('App is offline-ready! You can play games offline.');
    },
  });
}
