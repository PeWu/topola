import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    exclude: [
      'tests/screenshots.spec.ts',
      'tests/browser-contracts.spec.ts',
      'tests/animation-smoothness.spec.ts',
      'node_modules/**',
      'dist/**',
    ],
  },
});
