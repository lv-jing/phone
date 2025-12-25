import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './', // 使用相对路径，适用于根目录部署
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


