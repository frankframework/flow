import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import mdx from '@mdx-js/rollup'
import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export default defineConfig({
  plugins: [tailwindcss(), mdx(), reactRouter(), tsconfigPaths(), svgr()],
  server: {
    port: 3000,
  },
})
