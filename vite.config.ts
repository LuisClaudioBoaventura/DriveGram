import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 1800000,
        proxyTimeout: 1800000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res: any) => {
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend ainda inicializando ou indisponível temporariamente', message: err.message }));
            }
          });
        }
      },
    },
  },
});
