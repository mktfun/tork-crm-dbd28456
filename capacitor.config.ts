import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tork.portal',
  appName: 'Tork Portal',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true
    }
  }
};

export default config;
