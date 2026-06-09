import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5001,
    proxy: {
      '/api': {
        target: 'http://localhost:3110',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3110',
        ws: true
      }
    }
  }
})
