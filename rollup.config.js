import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import uglify from 'rollup-plugin-uglify';

const browser = {
  format: 'umd',
  name: 'rxFirebase',
  plugins: (...extras) => [
    resolve(),
    commonjs(),
    babel({exclude: 'node_modules/**'})
  ].concat(...extras)
};

export default [{
  input: 'src/index.mjs',
  output: {
    file: 'dist/rx-firebase.umd.js',
    format: browser.format,
    name: browser.name
  },
  plugins: browser.plugins()
}, {
  input: 'src/index.mjs',
  output: {
    file: 'dist/rx-firebase.umd.min.js',
    format: browser.format,
    name: browser.name
  },
  plugins: browser.plugins(uglify())
}, {
  input: 'src/index.mjs',
  output: [{
    file: 'dist/rx-firebase.js',
    format: 'cjs'
  }, {
    file: 'dist/rx-firebase.mjs',
    format: 'es'
  }]
}];
