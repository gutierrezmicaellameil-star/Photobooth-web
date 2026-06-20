import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev
export default defineConfig({
  // Highlighted Change: Tell Vite your GitHub repository subfolder name
  base: '/Photobooth-web/', 
  plugins: [
    react(),
    tailwindcss(),
  ],
})
