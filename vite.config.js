import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/phone/',
    plugins: [vue()],
    optimizeDeps: {
        include: ['tesseract.js']
    },
    define: {
        global: 'globalThis'
    },
    // 开发服务器配置
    server: {
        port: 8081,
        strictPort: false
    }
})


