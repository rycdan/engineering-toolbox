import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Relative base + hash routing lets the build run from any static path,
// including a GitHub Pages project site (see docs/DECISIONS.md D-002).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
