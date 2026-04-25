import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Electoral_info/',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setup.js',
  }
})
