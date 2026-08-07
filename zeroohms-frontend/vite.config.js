import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ponytail: rolldown-vite inlines a second copy of react into the react-dom
  // pre-bundle chunk -> "Invalid hook call" (dispatcher null). Excluding
  // react-dom makes it resolve react through the shared pre-bundled module.

})
