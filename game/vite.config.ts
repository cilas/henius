import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.png'],
  server: {
    port: 5173,
    watch: {
      followSymlinks: false,
    },
  },
})
