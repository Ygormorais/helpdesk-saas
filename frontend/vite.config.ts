import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || '';
  const apiTarget = /^https?:\/\//i.test(apiUrl) ? apiUrl : '';
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_BACKEND_URL || apiTarget || 'http://localhost:3000';

  return {
    plugins: [
      react({
        include: '**/*.{jsx,js,tsx,ts}',
      }),
      tsconfigPaths(),
    ],
    esbuild: {
      include: /\.[jt]sx?$/,
      exclude: [],
      loader: 'tsx',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});
