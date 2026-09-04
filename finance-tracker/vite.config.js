import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { wgslVitePlugin } from '@vgpu/wgsl/loader-vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src')

export default defineConfig({
  // wgslVitePlugin resolves the `.wgsl` import graph in triangle-led-front/ at
  // build time and hands each entry shader to vgpu as one finished ShaderSource.
  plugins: [react(), tailwindcss(), wgslVitePlugin()],
  resolve: {
    alias: { '@': src },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data fetching & state
          'vendor-query': ['@tanstack/react-query', 'axios'],
          // Charts
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Heavy utilities — load lazily
          'vendor-ocr': ['tesseract.js'],
          'vendor-xlsx': ['xlsx', 'papaparse'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          // Icons & UI
          'vendor-ui': ['lucide-react', 'react-hot-toast'],
          'vendor-heroui': ['@heroui/react'],
        },
      },
    },
  },
})

