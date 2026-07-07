import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this at /kancolle-gear-graph/, asset URLs need the prefix
  base: '/kancolle-gear-graph/',
  plugins: [react()],
})
