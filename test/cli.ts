import CliApp from '../lib/cli-app.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import TestView from './lib/test-view.ts'
import CountingPlugin from './lib/counting-plugin.ts'
import DiffView from '../lib/view/diff.ts'
import { strict as a } from 'node:assert'

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 0

const { test, only, skip } = createSuite()

test.set('simple', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({
    argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath]
  })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('simple, dry run', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--dry-run'] })
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), false)
})

test.set('simple, using bin', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const origArgv = process.argv
  process.argv = ['node', 'test.js', '-s', '--find', 'one', '--replace', 'yeah', fixturePath]
  a.deepEqual(fs.existsSync(fixturePath), true)
  const mod = await import('../bin/cli.ts')
  await mod.default
  process.argv = origArgv
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('simple, find string not found', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'o.e', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), false)
})

test.set('simple regexp', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/one`), true)
  await cliApp.start({ argv: ['-s', '--find', '/o.e/', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/one`), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('simple regexp, case sensitive', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/ONE`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', '/one/', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), false)
})

test.set('simple regexp, insensitive', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/ONE`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', '/one/i', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('input file list on stdin', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const renamer = spawn(process.execPath, [path.join('bin', 'cli.ts'), '-f', 'one', '-r', 'two', '-s'])
  return new Promise<void>((resolve) => {
    renamer.on('close', () => {
      a.deepEqual(fs.existsSync(`${testRoot}/${index}/one`), false)
      a.deepEqual(fs.existsSync(`${testRoot}/${index}/two`), true)
      resolve()
    })
    renamer.stdin.end(fixturePath)
  })
})

test.set('--help', async function () {
  let output = ''
  const testView = new TestView()
  testView.log = function (msg?: string) {
    output += msg
  }
  const cliApp = new CliApp({ view: testView })
  await cliApp.start({ argv: ['--help'] })
  a.equal(output.match(/Synopsis/g)?.length, 1)
})

test.set('--regexp, append extention', async function () {
  index++
  const testDir = `${testRoot}/${index}`
  createFixture(`${testDir}/one1`)
  createFixture(`${testDir}/one2`)
  const cliApp = new CliApp()
  await cliApp.start({ argv: ['-s', '-f', '/(.+)/', '-r', '$1.log', `${testDir}/*`] })
  a.equal(fs.existsSync(`${testDir}/one1.log`), true)
  a.equal(fs.existsSync(`${testDir}/one1`), false)
  a.equal(fs.existsSync(`${testDir}/one2.log`), true)
  a.equal(fs.existsSync(`${testDir}/one2`), false)
})

test.set('--regexp, single replace', async function () {
  index++
  const testDir = `${testRoot}/${index}`
  createFixture(`${testDir}/ooo`)
  const cliApp = new CliApp()
  await cliApp.start({ argv: ['-s', '-f', '/o/', '-r', 'a', `${testDir}/*`] })
  a.equal(fs.existsSync(`${testDir}/aoo`), true)
  a.equal(fs.existsSync(`${testDir}/ooo`), false)
})

test.set('--regexp, global replace', async function () {
  index++
  const testDir = `${testRoot}/${index}`
  createFixture(`${testDir}/ooo`)
  const cliApp = new CliApp()
  await cliApp.start({ argv: ['-s', '-f', '/o/g', '-r', 'a', `${testDir}/*`] })
  a.equal(fs.existsSync(`${testDir}/aaa`), true)
  a.equal(fs.existsSync(`${testDir}/ooo`), false)
})

test.set('failed replace', async function () {
  index++
  const testDir = `${testRoot}/${index}`
  createFixture(`${testDir}/one`)
  createFixture(`${testDir}/two`)
  const cliApp = new CliApp()
  await cliApp.start({ argv: ['-s', '-f', 'one', '-r', 'two', `${testDir}/one`] })
  a.equal(fs.existsSync(`${testDir}/one`), true)
  a.equal(fs.existsSync(`${testDir}/two`), true)
  a.equal(process.exitCode, 1)
  process.exitCode = 0
})

test.set('simple, pass custom view to constructor', async function () {
  index++
  class TestDiffView extends DiffView {
    logs: string[][] = []
    override log (...args: string[]): void {
      this.logs.push(args)
    }
  }

  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp({ view: new TestDiffView() })
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['--find', 'one', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--view long', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', 'long'] })
  a.equal(cliApp.view.constructor.name, 'LongView')
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--view diff', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', 'diff'] })
  a.equal(cliApp.view.constructor.name, 'DiffView')
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--view one-line', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', 'one-line'] })
  a.equal(cliApp.view.constructor.name, 'OneLineView')
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--view: load plugin', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', './test/lib/dummy-view.ts'] })
  a.equal(cliApp.view.constructor.name, 'DummyView')
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--index-root', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--index-root', '10', '--find', 'one', '--replace', 'yeah{{index}}', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah10`), true)
})

test.set('--chain built-in', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--chain', 'find-replace', '--find', 'one', '--replace', 'yeah', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--chain built-in local --help', async function () {
  const view = new TestView()
  const cliApp = new CliApp({ view })
  await cliApp.start({
    argv: ['--chain', 'find-replace', '--chain', './test/lib/dummy-plugin.ts', '--help']
  })
  a.match(view.logs[0]?.[0] ?? '', /FindReplace/)
  a.match(view.logs[0]?.[0] ?? '', /DummyPlugin/)
})

test.set('--chain: local plugin package', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one-file`)
  const cliApp = new CliApp()
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--chain', 'renamer-case', '--case', 'camel', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/oneFile`), true)
})

test.set('--silent, view logging is not invoked', async function () {
  index++
  const view = new TestView()
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp({ view })
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['--find', 'one', '--replace', 'yeah', fixturePath, '--silent'] })
  a.deepEqual(fs.existsSync(fixturePath), false)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--verbose also shows non-renamed logs', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const view = new TestView()
  const cliApp = new CliApp({ view })
  /* verbose not set - nothing logged */
  await cliApp.start({
    argv: ['--find', 'asdf', '--replace', 'yeah', fixturePath]
  })
  a.equal(view.logs.length, 1)
  view.logs = []
  /* verbose set - log present */
  await cliApp.start({
    argv: ['--find', 'asdf', '--replace', 'yeah', fixturePath, '--verbose']
  })
  a.equal(view.logs.length, 2)
})

test.set('--view: load a JavaScript view module', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', './example/view/custom-view.js'] })
  a.equal(cliApp.view.constructor.name, 'CustomView')
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), true)
})

test.set('--find: a string containing slashes is not a regular expression', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  /* Previously 'x/on/' was silently treated as /on/, renaming one to Ze */
  await cliApp.start({ argv: ['-s', '--find', 'x/on/', '--replace', 'Z', fixturePath] })
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/Ze`), false)
})

test.set('--dry-run twice with one CliApp: no false "file exists"', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const view = new TestView()
  const cliApp = new CliApp({ view })
  const origCode = process.exitCode
  await cliApp.start({ argv: ['--dry-run', '--find', 'one', '--replace', 'two', fixturePath] })
  await cliApp.start({ argv: ['--dry-run', '--find', 'one', '--replace', 'two', fixturePath] })
  a.deepEqual(view.errors, [])
  a.equal(process.exitCode, origCode)
  a.deepEqual(fs.existsSync(fixturePath), true)
})

test.set('--chain: each plugin is instantiated once per run', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const cliApp = new CliApp()
  const before = CountingPlugin.instances
  await cliApp.start({ argv: ['-s', '--chain', './test/lib/counting-plugin.ts', fixturePath] })
  a.equal(CountingPlugin.instances - before, 1)
})

export { test, only, skip }
