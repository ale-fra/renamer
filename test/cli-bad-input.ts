import CliApp from '../lib/cli-app.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import DefaultView from '../lib/view/default.ts'
import TestView from './lib/test-view.ts'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 0

test.set('invalid option: exit code set to 1, usage guide suggested, no file renamed', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const origCode = process.exitCode
  const logs: string[] = []
  const view = new DefaultView()
  view.log = function (line?: string) {
    logs.push(line ?? '')
  }
  const cliApp = new CliApp({ view })
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['node', 'test', '--find', 'one', '--replace', 'yeah', fixturePath, '--broken'] })
  a.equal(process.exitCode, 1)
  process.exitCode = origCode
  a.deepEqual(fs.existsSync(fixturePath), true)
  a.deepEqual(fs.existsSync(`${testRoot}/${index}/yeah`), false)
  a.equal(logs.length, 2)
  a.match(logs[0] ?? '', /Unknown option: --broken/)
  a.match(logs[1] ?? '', /Run `renamer --help` for usage instructions/)
})

test.set('--view: broken plugin', async function () {
  index++
  const origCode = process.exitCode
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const view = new TestView()
  const cliApp = new CliApp({ view })
  a.deepEqual(fs.existsSync(fixturePath), true)
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', fixturePath, '--view', './test/lib/broken-view.ts'] })
  a.equal(cliApp.view.constructor.name, 'TestView')
  a.match(view.logs[0]?.[0] ?? '', /View must define a `write` method/)
  a.equal(process.exitCode, 1)
  process.exitCode = origCode
  a.deepEqual(fs.existsSync(fixturePath), true)
})

test.set('--view: module without a class export', async function () {
  const origCode = process.exitCode
  const view = new TestView()
  const cliApp = new CliApp({ view })
  await cliApp.start({ argv: ['-s', '--find', 'one', '--replace', 'yeah', 'one', '--view', './test/lib/util.ts'] })
  a.match(view.errors[0]?.message ?? '', /View module must export a class/)
  a.equal(process.exitCode, 1)
  process.exitCode = origCode
})

test.set('--help with a plugin that defines no options: usage printed, no crash', async function () {
  /* Previously a TypeError escaped as an unhandled rejection as printUsage() was not awaited */
  const origCode = process.exitCode
  const view = new TestView()
  const cliApp = new CliApp({ view })
  await cliApp.start({ argv: ['--chain', './example/chain/prefix.js', '--help'] })
  a.deepEqual(view.errors, [])
  a.match(view.logs[0]?.[0] ?? '', /Prefix/)
  a.equal(process.exitCode, origCode)
})

test.set('--help: errors while printing usage are handled', async function () {
  /* printUsage() is awaited, so its failures reach halt() and set the exit code */
  const origCode = process.exitCode
  class ThrowingUsageView extends TestView {
    override write (...args: Parameters<TestView['write']>): void {
      if (args[0] === 'usage') throw new Error('usage failed')
      super.write(...args)
    }
  }
  const view = new ThrowingUsageView()
  const cliApp = new CliApp({ view })
  await cliApp.start({ argv: ['--help'] })
  a.match(view.errors[0]?.message ?? '', /usage failed/)
  a.equal(process.exitCode, 1)
  process.exitCode = origCode
})

test.set('invalid regular expression flags: exit code set to 1', async function () {
  index++
  const origCode = process.exitCode
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const view = new TestView()
  const cliApp = new CliApp({ view })
  await cliApp.start({ argv: ['--find', '/one/q', '--replace', 'two', fixturePath] })
  a.match(view.errors[0]?.message ?? '', /Invalid flags/)
  a.equal(process.exitCode, 1)
  process.exitCode = origCode
  a.deepEqual(fs.existsSync(fixturePath), true)
})

export { test, only, skip }
