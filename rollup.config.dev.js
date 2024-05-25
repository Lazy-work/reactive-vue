import nodeResolve from "@rollup/plugin-node-resolve";
import esbuild from "rollup-plugin-esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
    browser: true,
  }),
  esbuild({
    tsconfig: path.resolve(__dirname, "tsconfig.json"),
    sourceMap: true,
    target: "es2016",
    define: {
      __DEV__: "true",
    },
  }),
];

export default [
  {
    external: ["react"],
    input: "src/index.js",
    output: [
      {
        file: "dist/reactive-vue.cjs.dev.js",
        format: "cjs",
        sourcemap: true,
      },
      {
        file: "dist/reactive-vue.dev.js",
        format: "es",
        sourcemap: true,
      },
    ],
    plugins,
  },
];
