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
  define: {
    API_BASE_URL: JSON.stringify(process.env.API_BASE_URL),
  },
  server: {
    port: 3000,
    proxy: {
      '/test': {
        target: 'http://localhost:8080', // Spring Boot backend
        changeOrigin: true,
      },
      '/configurations': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
