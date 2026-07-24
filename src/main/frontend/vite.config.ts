import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import svgr from 'vite-plugin-svgr'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mdx({
      remarkPlugins: [remarkGfm],
    }),
    svgr(),
    checker({
      typescript: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['xmllint-wasm'],
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
