import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: true, // IMPORTANT: Estableix-ho a `true` perquè Vite busqui el postcss.config.js automàticament
  },
})