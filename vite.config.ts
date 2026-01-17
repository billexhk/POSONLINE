
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/pos_api': {
        target: 'http://localhost',
        changeOrigin: false,
      },
    },
  },
})
