'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/reactive-vue.cjs.prod.js')
} else {
  module.exports = require('./dist/reactive-vue.cjs.dev.js')
}
