import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import mdx from '@mdx-js/rollup'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

dotenv.config({ quiet: true })
import remarkGfm from 'remark-gfm'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ffDocRoot = path.resolve(__dirname, 'node_modules/@frankframework/ff-doc')

export default defineConfig({
  plugins: [
    tailwindcss(),
    mdx({
      remarkPlugins: [remarkGfm],
    }),
    reactRouter(),
    tsconfigPaths(),
    svgr(),
  ],
  optimizeDeps: {
    exclude: ['xmllint-wasm'],
  },
  resolve: {
    alias: {
      '@frankframework/ff-doc/react': path.join(ffDocRoot, 'react/frankframework-ff-doc.mjs'),
      '@frankframework/ff-doc': path.join(ffDocRoot, 'frankframework-ff-doc.mjs'),
    },
  },
  server: {
    port: 3000,
  },
})
