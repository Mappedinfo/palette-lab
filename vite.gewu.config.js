import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* 格物 GEWU 插件构建：相对路径 + 固定产物名 gewu-plugin.js
   产物输出到 dist-gewu/，由 gewu-lab 的 scripts/embed.mjs 消费 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-gewu',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/gewu-main.jsx',
      output: {
        entryFileNames: 'gewu-plugin.js',
        chunkFileNames: 'gewu-[name]-[hash].js',
        assetFileNames: 'gewu-plugin.[ext]',
      },
    },
  },
})
