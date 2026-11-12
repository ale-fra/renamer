/*
 * The examples: each TypeScript example must behave exactly like its JavaScript twin.
 */
import CliApp from '../lib/cli-app.ts'
import TestView from './lib/test-view.ts'
import { createFixture, createSuite } from './lib/util.ts'
import { strict as a } from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { inspect } from 'node:util'

const { test, only, skip } = createSuite()

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
const pics = [createFixture(`${testRoot}/pics/pic1.jpg`), createFixture(`${testRoot}/pics/pic2.jpg`)]

/* Run the CLI, returning what was written to the view */
async function runWithPlugin (argv: string[]): Promise<string[][]> {
  const view = new TestView()
  await new CliApp({ view }).start({ argv })
  a.deepEqual(view.errors, [])
  return view.logs
}

/* Run the CLI with a custom view, returning the console output */
async function runWithView (argv: string[]): Promise<unknown[][]> {
  const calls: unknown[][] = []
  const origLog = console.log
  const origError = console.error
  console.log = console.error = (...args: unknown[]) => { calls.push(args) }
  try {
    await new CliApp().start({ argv })
  } finally {
    console.log = origLog
    console.error = origError
  }
  return calls
}

test.set('chain/prefix: JS and TS versions match', async function () {
  const js = await runWithPlugin(['-d', '--chain', 'example/chain/prefix.js', ...pics])
  const ts = await runWithPlugin(['-d', '--chain', 'example/chain/prefix.ts', ...pics])
  a.deepEqual(js, ts)
  a.ok(js.some(([line]) => line?.includes('[DONE] pic1.jpg')))
})

test.set('chain/suffix: JS and TS versions match, with and without --suffix', async function () {
  for (const extraArgs of [['--suffix=-done'], []]) {
    const js = await runWithPlugin(['-d', '--chain', 'example/chain/suffix.js', ...extraArgs, ...pics])
    const ts = await runWithPlugin(['-d', '--chain', 'example/chain/suffix.ts', ...extraArgs, ...pics])
    a.deepEqual(js, ts)
  }
  const withSuffix = await runWithPlugin(['-d', '--chain', 'example/chain/suffix.ts', '--suffix=-done', ...pics])
  a.ok(withSuffix.some(([line]) => line?.includes('pic1-done.jpg')))
})

test.set('view/custom-view: JS and TS versions match', async function () {
  const js = await runWithView(['-d', '-f', 'pic', '-r', 'photo', '--view', 'example/view/custom-view.js', ...pics])
  const ts = await runWithView(['-d', '-f', 'pic', '-r', 'photo', '--view', 'example/view/custom-view.ts', ...pics])
  a.deepEqual(js, ts)
  a.equal(js.length, 4)
})

test.set('view/minimal-view: JS and TS versions match', async function () {
  const js = await runWithView(['-d', '-f', 'pic', '-r', 'photo', '--view', 'example/view/minimal-view.js', ...pics])
  const ts = await runWithView(['-d', '-f', 'pic', '-r', 'photo', '--view', 'example/view/minimal-view.ts', ...pics])
  /* Compare the event keys and values: the options differ, as they include the view path */
  a.deepEqual(js.map(args => args.slice(0, 2)), ts.map(args => args.slice(0, 2)))
  a.deepEqual(js.map(args => args[0]), ['info', 'start', 'result', 'result', 'complete'])
})

test.set('api examples run, JS and TS versions match', function () {
  /* The examples expect example/sandbox, relative to the project root */
  const sandbox = spawnSync(process.execPath, ['make-sandbox.js'], { cwd: 'example', encoding: 'utf8' })
  a.equal(sandbox.status, 0, sandbox.stderr)
  try {
    /* The examples import `renamer`, which resolves to dist/. Point copies at the sources instead. */
    const outDir = `${testRoot}/api`
    fs.mkdirSync(outDir, { recursive: true })
    const indexUrl = pathToFileURL(path.resolve('index.ts')).href
    const run = (file: string): string => {
      const copy = path.join(outDir, path.basename(file))
      fs.writeFileSync(copy, fs.readFileSync(file, 'utf8').replace(/from 'renamer'/g, `from '${indexUrl}'`))
      const result = spawnSync(process.execPath, [copy], { encoding: 'utf8' })
      a.equal(result.status, 0, `${file}: ${result.stderr}`)
      return result.stdout
    }
    for (const name of ['simple-find-replace', 'result-iterator', 'index-replace']) {
      a.equal(run(`example/api/${name}.js`), run(`example/api/${name}.ts`), name)
    }
    a.ok(run('example/api/result-iterator.js').includes(`to: ${inspect(path.join('example', 'sandbox', 'pics', 'photo1.jpg'))}`))
    /* Both examples are dry runs */
    a.ok(fs.existsSync('example/sandbox/pics/pic1.jpg'))
  } finally {
    fs.rmSync('example/sandbox', { recursive: true, force: true })
  }
})

export { test, only, skip }
