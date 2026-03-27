import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('supabase')) return 'vendor-supabase';
            if (id.includes('pdfjs-dist') || id.includes('react-pdf')) return 'vendor-pdf';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
