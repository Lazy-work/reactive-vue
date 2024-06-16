import nodeResolve from "@rollup/plugin-node-resolve";
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';

const plugins = [
  nodeResolve({
    extensions: [".js", ".ts"],
  }),
  replace({
    '__DEV__': `!!(process.env.NODE_ENV !== 'production')`,
    preventAssignment: true
  }),
  commonjs(),
];

export default [
  {
    input: "src/index.js",
    output: [
      {
        file: "dist/reactive-vue-compiler.cjs.js",
        format: "cjs",
        sourcemap: true,
      }
    ],
    plugins,
  },
];
