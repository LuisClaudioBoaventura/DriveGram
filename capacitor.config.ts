import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.drivegram.app',
  appName: 'DriveGram',
  webDir: 'dist',
  server: {
    // Point the WebView directly at the embedded Express server.
    // The server serves both the React frontend and /api/* routes.
    url: 'http://localhost:5000',
    cleartext: true,
    androidScheme: 'http',
    allowNavigation: ['localhost', 'localhost:5000', '192.168.*.*', '10.*.*.*']
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
