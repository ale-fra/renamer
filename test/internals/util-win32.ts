import { depthFirstCompare } from '../../lib/util.ts'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'
import os from 'node:os'

const { test, only, skip } = createSuite()

if (os.platform() === 'win32') {
  test.set('depthFirstCompare(pathA, pathB) windows 1', function () {
    a.deepEqual(depthFirstCompare('\\one\\two', '\\one'), -1)
    a.deepEqual(depthFirstCompare('\\one', '\\one\\two'), 1)
    a.deepEqual(depthFirstCompare('\\one', '\\one'), 0)
  })

  test.set('depthFirstCompare(pathA, pathB) windows 2 (cygwin usage)', function () {
    a.deepEqual(depthFirstCompare('/one/two', '/one'), -1)
    a.deepEqual(depthFirstCompare('/one', '/one/two'), 1)
    a.deepEqual(depthFirstCompare('/one', '/one'), 0)
  })
}

export { test, only, skip }
