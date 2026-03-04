import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Vite default - different from proxy server (3000)
    cors: true,
    proxy: {
      // Proxy API calls to the local server during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
