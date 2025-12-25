import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // 部署配置说明：
  // - GitHub Pages 子目录部署（如 username.github.io/phoneNumber）：base 应该是 '/phoneNumber/'
  // - GitHub Pages 用户/组织页面（如 username.github.io）：base 应该是 '/'
  // - Vercel/Netlify/自定义域名：base 应该是 '/'
  // 
  // 当前部署在根路径 lv-jing.github.io，所以 base 设置为 '/'
  // 如果遇到 404 错误，请检查：
  // 1. 是否部署了构建后的 dist 目录的内容（不是源代码目录）
  // 2. GitHub Pages 设置中源分支/目录是否正确（应该是 dist 或 gh-pages 分支的根目录）
  // 3. 确保部署的是 dist 目录内的所有文件，而不是 dist 目录本身
  base: '/',
  plugins: [vue()],
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


