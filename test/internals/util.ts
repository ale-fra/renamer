import { depthFirstCompare, regExpBuilder } from '../../lib/util.ts'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

test.set('depthFirstSort(files)', function () {
  const files = ['one', 'one/two', 'one/three', 'four', 'one/two/five']
  const result = files.sort(depthFirstCompare)
  a.deepEqual(result, ['one/two/five', 'one/two', 'one/three', 'one', 'four'])
})

test.set('depthFirstCompare(pathA, pathB)', function () {
  a.deepEqual(depthFirstCompare('/one/two', '/one'), -1)
  a.deepEqual(depthFirstCompare('/one', '/one/two'), 1)
  a.deepEqual(depthFirstCompare('/one', '/one'), 0)
})

test.set('regExpBuilder(find): regular expression literals', function () {
  a.deepEqual(regExpBuilder('/o.e/'), /o.e/)
  a.deepEqual(regExpBuilder('/one/gi'), /one/gi)
  a.deepEqual(regExpBuilder('/(.+)/'), /(.+)/)
})

test.set('regExpBuilder(find): plain strings returned unchanged', function () {
  a.equal(regExpBuilder('one'), 'one')
  a.equal(regExpBuilder('o.e'), 'o.e')
})

test.set('regExpBuilder(find): only a whole-string literal is a regular expression', function () {
  /* Previously 'x/on/' silently became /on/ and 'a/b/c' threw "Invalid flags" */
  a.equal(regExpBuilder('x/on/'), 'x/on/')
  a.equal(regExpBuilder('a/b/c'), 'a/b/c')
  a.equal(regExpBuilder('/one/ '), '/one/ ')
  a.deepEqual(regExpBuilder('/a/b/g'), /a\/b/g)
})

test.set('regExpBuilder(find): RegExp instances returned unchanged', function () {
  const re = /one/i
  a.equal(regExpBuilder(re), re)
})

test.set('regExpBuilder(find): invalid flags throw', function () {
  a.throws(() => regExpBuilder('/one/q'), SyntaxError)
})

test.set('regExpBuilder(find): empty input returns null', function () {
  a.equal(regExpBuilder(''), null)
  a.equal(regExpBuilder(undefined), null)
  a.equal(regExpBuilder(null), null)
})

export { test, only, skip }
