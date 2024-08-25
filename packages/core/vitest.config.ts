import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'node:path'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: '"test"',
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __CJS__: true,
    __SSR__: true,
    __FEATURE_OPTIONS_API__: true,
    __FEATURE_SUSPENSE__: true,
    __FEATURE_PROD_DEVTOOLS__: false,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    __COMPAT__: true,
  },
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@vue/reactivity": path.resolve(__dirname, "../../vue/packages/reactivity/src"),
      "@vue/runtime-core": path.resolve(__dirname, "../../vue/packages/runtime-core/src")
    }
  },
  test: {
    globals: true,
    setupFiles: 'scripts/setup-vitest.ts',
    environment: 'jsdom'
  },
})