import Renamer from '../index.ts'
import type { Plugin } from '../index.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 0

test.set('simple', async function () {
  index++
  const testFolder = path.join(testRoot, String(index))
  createFixture(`${testFolder}/one`)
  createFixture(`${testFolder}/two`)
  let assertionCount = 0
  class TestPlugin implements Plugin {
    replace (filePath: string): string {
      const file = path.parse(filePath)
      if (assertionCount === 0) {
        a.equal(path.normalize(filePath), path.join(testFolder, 'one'))
        assertionCount++
        return `${file.dir}/test1`
      } else if (assertionCount === 1) {
        a.equal(path.normalize(filePath), path.join(testFolder, 'two'))
        assertionCount++
        return `${file.dir}/test2`
      } else {
        throw new Error('Unexpected call')
      }
    }
  }
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/one`, `${testFolder}/two`],
    chain: [TestPlugin]
  }
  await renamer.rename(options)
  a.equal(assertionCount, 2)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/test1`), true)
  a.equal(fs.existsSync(`${testFolder}/test2`), true)
})

test.set('chain of two plugins', async function () {
  index++
  const testFolder = path.join(testRoot, String(index))
  createFixture(`${testFolder}/one`)
  let assertionCount = 0
  class TestPlugin implements Plugin {
    replace (filePath: string): string {
      a.equal(path.normalize(filePath), path.join(testFolder, 'one'))
      assertionCount++
      return filePath + '1'
    }
  }
  class TestPlugin2 implements Plugin {
    replace (filePath: string): string {
      a.equal(filePath, `${testFolder}/one1`)
      assertionCount++
      return filePath + '2'
    }
  }
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/one`],
    chain: [TestPlugin, TestPlugin2]
  }
  await renamer.rename(options)
  a.equal(assertionCount, 2)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/one1`), false)
  a.equal(fs.existsSync(`${testFolder}/one12`), true)
})

test.set('plugin receives options, index and the full file list', async function () {
  index++
  const testFolder = path.join(testRoot, String(index))
  const one = createFixture(`${testFolder}/one`)
  const two = createFixture(`${testFolder}/two`)
  const calls: unknown[] = []
  class TestPlugin implements Plugin {
    replace (filePath: string, options: { suffix?: unknown }, index: number, files: string[]): string {
      calls.push([filePath, options.suffix, index, files])
      return filePath + String(options.suffix)
    }
  }
  const renamer = new Renamer()
  await renamer.rename({ files: [one, two], chain: [TestPlugin], suffix: '.bak', dryRun: true })
  a.deepEqual(calls, [
    [one, '.bak', 0, [one, two]],
    [two, '.bak', 1, [one, two]]
  ])
})

test.set('invalid plugin, no .replace() function', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  class InvalidPlugin {}
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    chain: [InvalidPlugin]
  }
  await a.rejects(
    // @ts-expect-error: a class without a replace method is only possible from JavaScript
    () => renamer.rename(options),
    /Invalid plugin/i
  )
})

test.set('invalid plugin, function doesn\'t return class', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const InvalidPlugin = 0
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    chain: [InvalidPlugin]
  }
  await a.rejects(
    // @ts-expect-error: a non-plugin value is only possible from JavaScript
    () => renamer.rename(options),
    /Invalid plugin/i
  )
})

export { test, only, skip }
