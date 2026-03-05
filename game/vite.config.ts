import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.png'],
  resolve: {
    alias: {
      '@kingdom-wars/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    watch: {
      followSymlinks: false,
    },
  },
})
