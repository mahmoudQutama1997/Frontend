import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const portalRoles = ['customer', 'captain', 'merchant', 'admin']

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.WASELNI_BACKEND_URL || 'http://127.0.0.1:8000'
  const portal = portalRoles.includes(mode) ? mode : 'all'
  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_WASELNI_APP_ROLE': JSON.stringify(env.VITE_WASELNI_APP_ROLE || portal) },
    server: {
      host: '0.0.0.0', port: 5173, strictPort: true,
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/media': { target: backend, changeOrigin: true },
        '/ws': { target: backend, ws: true, changeOrigin: true },
      },
    },
    build: {
      outDir: portal === 'all' ? 'dist' : `dist/${portal}`,
      emptyOutDir: true,
      rollupOptions: { input: 'index.html' },
    },
  }
})
