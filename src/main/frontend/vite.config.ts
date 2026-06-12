import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import mdx from '@mdx-js/rollup'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })
import remarkGfm from 'remark-gfm'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mdx({
      remarkPlugins: [remarkGfm],
    }),
    tsconfigPaths(),
    svgr(),
    checker({
      typescript: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['xmllint-wasm'],
  },
  server: {
    port: 3000,
  },
})
