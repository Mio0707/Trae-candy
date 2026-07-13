import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/Trae-candy/',
  server: {
    port: 8080,
    host: '0.0.0.0',
    allowedHosts: true,
    open: '/index.html',
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          mediapipe: ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
  assetsInclude: ['**/*.glb'],
});
