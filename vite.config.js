import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    open: true,
  },

  build: {
    // Raise the warning threshold slightly — our lazy chunks will be smaller
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached long-term, changes rarely
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],

          // Animation library — heaviest dependency, isolated for caching
          'vendor-motion': ['framer-motion'],

          // Supabase client — isolated so auth layer can cache independently
          'vendor-supabase': ['@supabase/supabase-js'],

          // Remaining third-party libs
          'vendor-misc': ['zustand', 'date-fns', 'lucide-react', '@hello-pangea/dnd'],
        },
      },
    },
  },
})
