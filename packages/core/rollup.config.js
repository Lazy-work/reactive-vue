import nodeResolve from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const resolveEntryForVuePkg = (/** @type {string} */ p) =>
  path.resolve(
    __dirname,
    `../../vue/packages/${p}/src/`,
  )

/** @type {Record<string, string>} */
const entries = {
  '@vue-internals/reactivity': resolveEntryForVuePkg('reactivity'),
  '@vue-internals/runtime-core': resolveEntryForVuePkg('runtime-core'),
  '@vue-internals/shared': resolveEntryForVuePkg('shared'),
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
    tsconfig: path.resolve(__dirname, "tsconfig.build.json"),
    sourceMap: true,
    target: "esnext",
  }),
  replace({
    '__DEV__': `!!(process.env.NODE_ENV !== 'production')`,
    __SSR__: `false`,
    __TEST__: `false`,
    __FEATURE_SUSPENSE__: `false`,
    preventAssignment: true
  }),
];

export default [
  {
    external: ["react"],
    input: "src/index.ts",
    output: [
      {
        file: "dist/bridge-core.esm-bundler.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/bridge-core.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  }
];
