import path from 'node:path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  test: {
    onConsoleLog(log, type) {
      console.log('log in test: ', log)
    },
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, './src/'),
    },
  },
})
