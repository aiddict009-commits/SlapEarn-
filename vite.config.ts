import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Hosts allowed to reach the dev server. Telegram Mini Apps are iframed
      // from web.telegram.org and sandboxes/previews are proxied through
      // *.e2b.app — without this Vite answers "Blocked request. This host is
      // not allowed." and the app never loads.
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.e2b.app',
        '.e2b.dev',
        '.run.app',
        '.web.app',
        '.firebaseapp.com',
        '.telegram.org',
      ],
    },
  };
});
