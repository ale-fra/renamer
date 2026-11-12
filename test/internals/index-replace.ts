import IndexReplace from '../../lib/chain/index-replace.ts'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'
import path from 'node:path'

const { test, only, skip } = createSuite()

test.set('paths without the token are unchanged', function () {
  const plugin = new IndexReplace()
  a.equal(plugin.replace('one', {}), 'one')
})

test.set('index increments per match, starting at 1', function () {
  const plugin = new IndexReplace()
  a.equal(plugin.replace('{{index}}', {}), '1')
  a.equal(plugin.replace('none', {}), 'none')
  a.equal(plugin.replace('{{index}}', {}), '2')
})

test.set('every token in the base name is replaced, the directory is untouched', function () {
  const plugin = new IndexReplace()
  a.equal(plugin.replace(path.join('{{index}}', 'a{{index}}b{{index}}'), {}), path.join('{{index}}', 'a1b1'))
})

test.set('a token in a directory name only is ignored and does not consume a number', function () {
  const plugin = new IndexReplace()
  a.equal(plugin.replace(path.join('{{index}}', 'a'), {}), path.join('{{index}}', 'a'))
  a.equal(plugin.replace('b{{index}}', {}), 'b1')
})

test.set('indexRoot: number or string', function () {
  const fromNumber = new IndexReplace()
  a.equal(fromNumber.replace('{{index}}', { indexRoot: 10 }), '10')
  a.equal(fromNumber.replace('{{index}}', { indexRoot: 10 }), '11')
  const fromString = new IndexReplace()
  a.equal(fromString.replace('{{index}}', { indexRoot: '10' }), '10')
  a.equal(fromString.replace('{{index}}', { indexRoot: '10' }), '11')
})

test.set('indexRoot: zero and negative', function () {
  const zero = new IndexReplace()
  a.equal(zero.replace('{{index}}', { indexRoot: '0' }), '0')
  a.equal(zero.replace('{{index}}', { indexRoot: '0' }), '1')
  const negative = new IndexReplace()
  a.equal(negative.replace('{{index}}', { indexRoot: -1 }), '-1')
  a.equal(negative.replace('{{index}}', { indexRoot: -1 }), '0')
})

test.set('indexFormat', function () {
  const plugin = new IndexReplace()
  a.equal(plugin.replace('file{{index}}', { indexFormat: '%03d' }), 'file001')
  a.equal(plugin.replace('file{{index}}', { indexFormat: '%03d' }), 'file002')
})

export { test, only, skip }
