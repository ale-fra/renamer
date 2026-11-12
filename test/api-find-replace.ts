import Renamer from '../index.ts'
import type { RenamerOptions } from '../index.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()
let index = 0

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })

test.set('simple rename', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'o',
    replace: 'a'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one`), false)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), true)
})

test.set('simple rename, just find-replace in the chain', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'o',
    replace: 'a',
    chain: 'find-replace'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one`), false)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), true)
})

test.set('no find-replace in chain, not renamed', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'o',
    replace: 'a',
    chain: 'index-replace'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one`), true)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), false)
})

test.set('nothing found', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'qqqq',
    replace: 'a'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one`), true)
})

test.set('target exists', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  createFixture(`${testRoot}/${index}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'one',
    replace: 'two'
  }
  await a.rejects(
    () => renamer.rename(options),
    (err: Error & { code?: unknown }) => err.code === 'exists'
  )
})

test.set('target exists, force', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const fixturePath2 = createFixture(`${testRoot}/${index}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'one',
    replace: 'two',
    force: true
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(fixturePath), false)
  a.equal(fs.existsSync(fixturePath2), true)
})

test.set("file doesn't exist: exception thrown", async function () {
  const renamer = new Renamer()
  const options = {
    files: ['asdfasfewf'],
    find: 'a',
    replace: 'e'
  }
  await a.rejects(
    () => renamer.rename(options),
    /do not exist/
  )
})

test.set('simple rename, dry-run', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'o',
    replace: 'a',
    dryRun: true
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), false)
  a.equal(fs.existsSync(`${testRoot}/${index}/one`), true)
})

test.set('empty result throws', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'one',
    replace: ''
  }
  await a.rejects(
    () => renamer.rename(options),
    /empty/
  )
})

skip.set('rename symlink', undefined)

test.set('depth-first renaming: renames deepest files first regardless or order supplied', async function () {
  index++
  const testDir = `${testRoot}/${index}`
  const renamer = new Renamer()
  createFixture(`${testDir}/one/two`)
  createFixture(`${testDir}/one/four/two`)
  await renamer.rename({
    files: [`${testDir}/one`, `${testDir}/one/two`, `${testDir}/one/four`, `${testDir}/one/four/two`],
    find: 'o',
    replace: 'a'
  })
  a.equal(fs.existsSync(`${testDir}/one`), false)
  a.equal(fs.existsSync(`${testDir}/one/two`), false)
  a.equal(fs.existsSync(`${testDir}/ane`), true)
  a.equal(fs.existsSync(`${testDir}/ane/twa`), true)
})

test.set('path-element name', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one.txt`)
  const renamer = new Renamer()
  const options: RenamerOptions = {
    files: [fixturePath],
    find: /$/,
    replace: '-done',
    pathElement: 'name'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one.txt`), false)
  a.equal(fs.existsSync(`${testRoot}/${index}/one-done.txt`), true)
})

test.set('path-element ext', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one.txt`)
  const renamer = new Renamer()
  const options: RenamerOptions = {
    files: [fixturePath],
    find: /^\./,
    replace: '.done-',
    pathElement: 'ext'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/one.txt`), false)
  a.equal(fs.existsSync(`${testRoot}/${index}/one.done-txt`), true)
})

test.set('dry run twice in one process: no false "file exists"', async function () {
  /* The dry-run collision log used to be module state shared by every run */
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options: RenamerOptions = { files: [fixturePath], find: 'one', replace: 'two', dryRun: true }
  await renamer.rename(options)
  const results = await renamer.rename(options)
  a.deepEqual(results, [{ from: fixturePath, to: path.join(testRoot, String(index), 'two'), renamed: true }])
  a.equal(fs.existsSync(fixturePath), true)
})

test.set('dry run: two files renamed to the same target in one run are rejected', async function () {
  index++
  const one = createFixture(`${testRoot}/${index}/one`)
  const two = createFixture(`${testRoot}/${index}/two`)
  const renamer = new Renamer()
  await a.rejects(
    () => renamer.rename({ files: [one, two], find: /one|two/, replace: 'three', dryRun: true }),
    (err: Error & { code?: unknown }) => err.code === 'exists'
  )
  a.equal(fs.existsSync(one), true)
  a.equal(fs.existsSync(two), true)
})

test.set('replace omitted: defaults to an empty string', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  await renamer.rename({ files: [fixturePath], find: 'o' })
  a.equal(fs.existsSync(`${testRoot}/${index}/ne`), true)
})

test.set('results are typed: renamed results have a string `to`', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  for await (const result of renamer.results({ files: [fixturePath], find: 'one', replace: 'two', dryRun: true })) {
    if (result.renamed) {
      const to: string = result.to
      a.equal(to, path.join(testRoot, String(index), 'two'))
    } else {
      a.fail('expected a rename')
    }
  }
})

export { test, only, skip }
