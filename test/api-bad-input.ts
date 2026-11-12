import Renamer from '../index.ts'
import type { RenamerOptions } from '../index.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 1

test.set('arrayifies files', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: fixturePath,
    find: 'o',
    replace: 'a'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), true)
})

test.set('empty plugin list defaults to [ default, index ]', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    plugin: [],
    find: 'o',
    replace: 'a'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testRoot}/${index}/ane`), true)
})

test.set('no find or replace input', async function () {
  const fixturePath = createFixture(`${testRoot}/${index++}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath]
  }
  await a.rejects(
    () => renamer.rename(options),
    /Please specify a value/i
  )
})

test.set('broken path-element', async function () {
  const fixturePath = createFixture(`${testRoot}/${index++}/one`)
  const renamer = new Renamer()
  const options: RenamerOptions = {
    files: [fixturePath],
    find: 'one',
    replace: 'two',
    // @ts-expect-error: an invalid path element is only possible from JavaScript or the CLI
    pathElement: 'broken'
  }
  await a.rejects(
    () => renamer.rename(options),
    /Invalid path element/i
  )
})

test.set('replace result is an empty string', async function () {
  const fixturePath = createFixture(`${testRoot}/${index++}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    find: 'one',
    replace: ''
  }
  await a.rejects(
    () => renamer.rename(options),
    /Replace resulted in empty filename./i
  )
})

test.set('replace result is an empty string 2', async function () {
  const fixturePath = createFixture(`${testRoot}/${index++}/one`)
  const renamer = new Renamer()
  const options: RenamerOptions = {
    files: [fixturePath],
    find: 'one',
    replace: '',
    pathElement: 'name'
  }
  await a.rejects(
    () => renamer.rename(options),
    /Replace resulted in empty filename./i
  )
})

export { test, only, skip }
