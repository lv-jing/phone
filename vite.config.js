import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
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
    },
    build: {
        // 确保资源路径使用相对路径
        assetsDir: 'assets',
        // 生成的文件名包含hash，避免缓存问题
        rollupOptions: {
            output: {
                // 确保资源文件使用相对路径
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js'
            }
        }
    },
    // 开发服务器配置
    server: {
        port: 5173,
        strictPort: false
    }
})


