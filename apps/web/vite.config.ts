import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const commitSha = process.env.VITE_COMMIT_SHA || 'dev';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-commit-sha',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="app-version" content="${commitSha}" />\n  </head>`,
        );
      },
    },
  ],
  define: {
    __COMMIT_SHA__: JSON.stringify(commitSha),
  },
  resolve: {
    alias: {
      '@fire-sim/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7071',
        changeOrigin: true,
      },
    },
  },
});
