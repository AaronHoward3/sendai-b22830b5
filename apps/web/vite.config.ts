import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: Vite serves on 5173 and proxies /api/* to your local API (3001).
// Prod: Vercel rewrites /api/* to your Render API (via vercel.json).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
