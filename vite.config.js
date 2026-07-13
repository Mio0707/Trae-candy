import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 8080,
    host: '0.0.0.0',
    allowedHosts: true,
    open: '/index.html',
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  assetsInclude: ['**/*.glb'],
});