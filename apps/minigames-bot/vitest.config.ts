import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.{ts,js}'],
    setupFiles: [],
  },
  resolve: {
    alias: {
      '#services/database': path.resolve(__dirname, 'src/services/database/index.js'),
      '#utils/logger': path.resolve(__dirname, 'src/utils/logger.js'),
      '#services': path.resolve(__dirname, 'src/services'),
      '#handlers': path.resolve(__dirname, 'src/handlers'),
      '#polymorphia': path.resolve(__dirname, 'src/polymorphia'),
      '#utils': path.resolve(__dirname, 'src/utils'),
    },
  },
})
