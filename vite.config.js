import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// VITE_ALLOWED_HOSTS lets a preview hostname through without hardcoding it
// into tracked files (see README-free setup notes in the final report).
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3003,
    allowedHosts,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
