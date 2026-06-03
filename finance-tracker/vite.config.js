import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
        },
      },
    },
  },
})

