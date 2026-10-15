import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/app/',
  server: {
    proxy: {
      '/auth': 'http://localhost:9000',
      '/user': 'http://localhost:9000',
      '/message': 'http://localhost:9000',
      '/identity-request': 'http://localhost:9000',
      '/conversation': 'http://localhost:9000',
      '/assets': 'http://localhost:9000'
    }
  }
})
