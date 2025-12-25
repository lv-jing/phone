import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/phone/',
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  optimizeDeps: {
    include: ['tesseract.js']
  },
  define: {
    global: 'globalThis'
  },
  resolve: {
    alias: {
      // 确保正确处理 CommonJS 模块
    }
  }
})


