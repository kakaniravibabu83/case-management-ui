import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forwards every /api/** call to the Spring Boot backend, so the browser only
      // ever talks to http://localhost:5173 and never hits a cross-origin request -
      // no CORS configuration needed on the backend. Change the target if your
      // backend runs somewhere other than localhost:8080.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
