// @ts-check
// these aliases are shared between vitest and rollup
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const resolveEntryForPkg = (/** @type {string} */ p) =>
  path.resolve(
    __dirname,
    `../vue/packages/${p}/src/index.ts`,
  )

const dirs = readdirSync(path.resolve(__dirname, '../vue/packages'))

/** @type {Record<string, string>} */
const entries = {
  vue: resolveEntryForPkg('vue'),
  'vue/compiler-sfc': resolveEntryForPkg('compiler-sfc'),
  'vue/server-renderer': resolveEntryForPkg('server-renderer'),
  '@vue/compat': resolveEntryForPkg('vue-compat'),
}

const nonSrcPackages = ['sfc-playground', 'template-explorer', 'dts-test']

for (const dir of dirs) {
  const key = `@vue/${dir}`
  if (
    dir !== 'vue' &&
    !nonSrcPackages.includes(dir) &&
    !(key in entries) &&
    statSync(path.resolve(__dirname, '../vue/packages', dir)).isDirectory()
  ) {
    entries[key] = resolveEntryForPkg(dir)
  }
}

export { entries }
