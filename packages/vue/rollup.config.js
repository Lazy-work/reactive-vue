import nodeResolve from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const resolveEntryForVueInternalPkg = (/** @type {string} */ p) =>
  path.resolve(
    __dirname,
    `../../vue/packages/${p}/src/`,
  )

const resolveEntryForVuePkg = (/** @type {string} */ p) =>
  path.resolve(
    __dirname,
    `../../vue/packages/${p}/src/index.ts`,
  )

/** @type {Record<string, string>} */
const entries = {
  '@vue-internals/reactivity': resolveEntryForVueInternalPkg('reactivity'),
  '@vue-internals/runtime-core': resolveEntryForVueInternalPkg('runtime-core'),
  '@vue-internals/shared': resolveEntryForVueInternalPkg('shared'),
  '@vue/reactivity': resolveEntryForVuePkg('reactivity'),
  '@vue/runtime-core': resolveEntryForVuePkg('runtime-core'),
  '@vue/shared': resolveEntryForVuePkg('shared'),
  "@bridge/core": path.resolve(__dirname, '../../packages/core/src/'),
}
const plugins = [
  alias({
    entries
  }),
  nodeResolve({
    extensions: [".js", ".ts"],
    browser: true,
  }),
  esbuild({
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    sourceMap: true,
    target: "esnext"
  }),
  replace({
    '__DEV__': `!!(process.env.NODE_ENV !== 'production')`,
    __TEST__:`false`,
    __BROWSER__:`false`,
    __GLOBAL__:`false`,
    __ESM_BUNDLER__:`false`,
    __ESM_BROWSER__:`false`,
    __CJS__:`false`,
    __SSR__:`false`,
    __COMMIT__: "undefined",
    __VERSION__: "3.5",
    __COMPAT__:`false`,

    // Feature flags
    __FEATURE_OPTIONS_API__:`false`,
    __FEATURE_PROD_DEVTOOLS__:`false`,
    __FEATURE_SUSPENSE__:`false`,
    __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__:`false`,
    preventAssignment: true
  }),
];

export default [
  {
    external: ["react"],
    input: "src/index.ts",
    output: [
      {
        file: "dist/bridge-vue.esm-bundler.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/bridge-vue.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  }
];
