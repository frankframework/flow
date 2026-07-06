import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const docLibrary = (FFPackage: string, entry: string) =>
  fileURLToPath(new URL(`node_modules/@frankframework/${FFPackage}/${entry}`, import.meta.url))

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@frankframework/doc-library-core': docLibrary('doc-library-core', 'dist/doc-library-core.js'),
      '@frankframework/doc-library-react': docLibrary('doc-library-react', 'doc-library-react.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.react-router/', '**/*.config.*', '**/types.ts'],
    },
  },
})
