import nodeResolve from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace';
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
    browser: true,
  }),
  replace({
    '__DEV__': `!!(process.env.NODE_ENV !== 'production')`,
    preventAssignment: true
  }),
  esbuild({
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    sourceMap: true,
    target: "esnext"
  }),
];

export default [
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/babel-optimizer.esm-bundler.js",
        format: "es",
        sourcemap: true,
      },
      {
        file: "dist/babel-optimizer.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  },
];
