import { defineConfig } from 'vite';
// base './' so the build works under the GitHub Pages project path.
export default defineConfig({ base: './', build: { chunkSizeWarningLimit: 900 } });
