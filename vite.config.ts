import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Prevent Vite / esbuild from pre-bundling lucide-react which in some
    // published versions includes a malformed source map that breaks esbuild
    // during dependency optimization. Excluding it lets Vite load the ESM
    // module directly without running into the broken .map file.
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    sourcemapIgnoreList: (sourcePath) => {
      // Ignore lucide-react source map errors
      return sourcePath.includes('lucide-react');
    },
  };
});
