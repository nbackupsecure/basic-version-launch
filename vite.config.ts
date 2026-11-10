import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const APP_VERSION = '1.0.1';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-version-bust',
        transformIndexHtml(html) {
          return html.replace(
            /(<script\s+type="module"\s+crossorigin\s+src="[^"]+)(")/g,
            `$1?v=${APP_VERSION}$2`
          ).replace(
            /(<link\s+rel="stylesheet"\s+crossorigin\s+href="[^"]+)(")/g,
            `$1?v=${APP_VERSION}$2`
          );
        }
      }
    ],
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`
        }
      }
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
  };
});
