import renameFile from '../../lib/rename-file.ts'
import fs from 'node:fs'
import path from 'node:path'
import { createFixture, createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'

const testRoot = 'tmp/rename-file'
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 0

const { test, only, skip } = createSuite()

test.set('simple', async function () {
  index++
  const fromPath = createFixture(`${testRoot}/${index}/one`)
  const toPath = `${testRoot}/${index}/oneyeah`
  await renameFile(fromPath, toPath)
  a.deepEqual(fs.existsSync(fromPath), false)
  a.deepEqual(fs.existsSync(toPath), true)
})

test.set('must not overwrite', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const fixturePath2 = createFixture(`${testRoot}/${index}/two`)
  await a.rejects(
    () => renameFile(fixturePath, fixturePath2),
    /file exists/
  )
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(fixturePath2), true)
})

test.set('must not overwrite: error has code "exists"', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const fixturePath2 = createFixture(`${testRoot}/${index}/two`)
  await a.rejects(
    () => renameFile(fixturePath, fixturePath2),
    (err: Error & { code?: unknown }) => err.code === 'exists'
  )
})

test.set('must not overwrite, find and replace same', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  await a.rejects(
    () => renameFile(fixturePath, fixturePath),
    /file exists/
  )
  a.deepEqual(fs.existsSync(fixturePath), true)
})

test.set('force: overwrites an existing target', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const fixturePath2 = createFixture(`${testRoot}/${index}/two`)
  await renameFile(fixturePath, fixturePath2, { force: true })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(fixturePath2), true)
})

test.set('dry run: file untouched', async function () {
  index++
  const fromPath = createFixture(`${testRoot}/${index}/one`)
  const toPath = `${testRoot}/${index}/two`
  await renameFile(fromPath, toPath, { dryRun: true })
  a.deepEqual(fs.existsSync(fromPath), true)
  a.deepEqual(fs.existsSync(toPath), false)
})

test.set('dry run: two renames to the same target in one run are rejected', async function () {
  index++
  const one = createFixture(`${testRoot}/${index}/one`)
  const two = createFixture(`${testRoot}/${index}/two`)
  const target = `${testRoot}/${index}/three`
  const dryRunLog = new Map<string, string>()
  await renameFile(one, target, { dryRun: true, dryRunLog })
  await a.rejects(
    () => renameFile(two, target, { dryRun: true, dryRunLog }),
    (err: Error & { code?: unknown }) => err.code === 'exists' && /file exists/.test(err.message)
  )
})

test.set('dry run: relative and absolute aliases of the same target collide', async function () {
  index++
  const one = createFixture(`${testRoot}/${index}/one`)
  const two = createFixture(`${testRoot}/${index}/two`)
  const target = `${testRoot}/${index}/three`
  const dryRunLog = new Map<string, string>()
  await renameFile(one, target, { dryRun: true, dryRunLog })
  await a.rejects(
    () => renameFile(two, path.resolve(target), { dryRun: true, dryRunLog }),
    (err: Error & { code?: unknown }) => err.code === 'exists'
  )
  a.ok(fs.existsSync(one))
  a.ok(fs.existsSync(two))
  a.ok(!fs.existsSync(target))
})

test.set('dry run: separate runs do not share state', async function () {
  index++
  const one = createFixture(`${testRoot}/${index}/one`)
  const target = `${testRoot}/${index}/two`
  await renameFile(one, target, { dryRun: true, dryRunLog: new Map() })
  await renameFile(one, target, { dryRun: true, dryRunLog: new Map() })
  /* No log supplied: each call is checked in isolation */
  await renameFile(one, target, { dryRun: true })
  await renameFile(one, target, { dryRun: true })
})

test.set('dry run: a target named like an Object.prototype property is not a false collision', async function () {
  /* Non-existent paths are fine: a dry run only checks the target. */
  const dryRunLog = new Map<string, string>()
  await renameFile('one', 'constructor', { dryRun: true, dryRunLog })
  await renameFile('two', '__proto__', { dryRun: true, dryRunLog })
})

export { test, only, skip }
