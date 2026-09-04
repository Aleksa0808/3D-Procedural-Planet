import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    allowedHosts: ['factory.unibrix.net'],
  },
});
