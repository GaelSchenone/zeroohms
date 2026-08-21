import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/videos': 'http://localhost:5174',
      '/api/health': 'http://localhost:5174',
      '/api': 'http://localhost:3001',
    },
  },
  // ponytail: rolldown-vite inlines a second copy of react into the react-dom
  // pre-bundle chunk -> "Invalid hook call" (dispatcher null). Excluding
  // react-dom makes it resolve react through the shared pre-bundled module.

})
