import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tork.portal',
  appName: 'Tork Portal',
  webDir: 'dist',
  server: {
    url: 'https://sgc.gestorpulse.com.br',
    cleartext: true
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
};

export default config;
