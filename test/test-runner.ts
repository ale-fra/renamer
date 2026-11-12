import { strict as a } from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createSuite } from './lib/util.ts'

const { test, only, skip } = createSuite()

function runFixture (body: string): { status: number | null, output: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'renamer-runner-'))
  const fixture = path.join(dir, 'suite.mjs')
  fs.writeFileSync(fixture, `export const test = new Map()\nexport const only = new Map()\nexport const skip = new Map()\n${body}\n`)
  try {
    const result = spawnSync(process.execPath, ['scripts/test.ts', fixture], {
      encoding: 'utf8', timeout: 10_000, env: { ...process.env, FORCE_COLOR: '0' }
    })
    a.ifError(result.error)
    return { status: result.status, output: result.stdout + result.stderr }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

test.set('runner reports passing and skipped tests', function () {
  const result = runFixture("test.set('passing', () => {})\nskip.set('skipped', undefined)")
  a.equal(result.status, 0, result.output)
  a.match(result.output, /Passed\s+1/)
  a.match(result.output, /Skipped\s+1/)
  a.match(result.output, /RESULT\s+PASSED/)
})

test.set('runner fails on an assertion error', function () {
  const result = runFixture("test.set('failure', () => { throw new Error('expected failure') })")
  a.equal(result.status, 1, result.output)
  a.match(result.output, /Failed\s+1/)
  a.match(result.output, /expected failure/)
  a.match(result.output, /RESULT\s+FAILED/)
})

test.set('runner fails on a module load error', function () {
  const result = runFixture("throw new Error('load failure')")
  a.equal(result.status, 1, result.output)
  a.match(result.output, /1 failed to load/)
  a.match(result.output, /load failure/)
  a.match(result.output, /RESULT\s+FAILED/)
})

test.set('runner fails on a rejection after the last test completes', function () {
  const result = runFixture("test.set('late rejection', () => { setTimeout(() => { Promise.reject(new Error('delayed failure')) }, 50) })")
  a.equal(result.status, 1, result.output)
  a.match(result.output, /delayed failure/)
  a.match(result.output, /Errors\s+1 outside of any test/)
  a.match(result.output, /RESULT\s+FAILED/)
  a.doesNotMatch(result.output, /RESULT\s+PASSED/)
})

export { test, only, skip }
