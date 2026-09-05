import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drivegram.app',
  appName: 'DriveGram',
  webDir: 'dist',
  server: {
    // Note: Do NOT set premature url here to prevent cold-start net::ERR_CONNECTION_REFUSED.
    // MainActivity handles smooth transition to http://127.0.0.1:5000 after /api/health responds OK.
    cleartext: true,
    androidScheme: 'http',
    hostname: 'drivegram.internal',
    allowNavigation: [
      'localhost',
      'localhost:5000',
      '127.0.0.1',
      '127.0.0.1:5000',
      '192.168.*.*',
      '10.*.*.*'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#1a73e8',
      // Give Node.js Mobile time to start the server before hiding splash
      launchFadeOutDuration: 500
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a'
    }
  }
};

export default config;
