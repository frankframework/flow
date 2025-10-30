import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr'
import mdx from '@mdx-js/rollup'

export default defineConfig({
  plugins: [tailwindcss(), mdx(), reactRouter(), tsconfigPaths(), svgr()],
  server: {
    port: 3000,
    proxy: {
      '/js/frankdoc.json': {
        target: 'https://frankdoc.frankframework.org',
        changeOrigin: true,
      },
      '/test': {
        target: 'http://localhost:8080', // Spring Boot backend
        changeOrigin: true,
      },
      '/configurations': {
        target: 'http://localhost:8080', // Spring Boot backend
        changeOrigin: true,
      },
      '/projects': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
