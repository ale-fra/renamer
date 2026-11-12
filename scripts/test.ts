/*
 * Runs the test suite and prints a report.
 *
 * Usage: node scripts/test.ts [--typecheck] [file ...]
 *
 *   --typecheck   Type-check the project first (as `npm test` does). If the type
 *                 check fails, the tests are not run.
 *   file ...      The test modules to run. Defaults to every module in test/ and
 *                 test/internals/ (test/lib contains helpers and fixtures).
 *
 * Each test module exports three Maps of test name to test function: `test`, `only`
 * and `skip`. If any module has `only` tests, just those are run. Tests run one at a
 * time, in file order. The exit code is 1 if anything failed.
 */
import chalk from 'chalk'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { pathToFileURL } from 'node:url'
import { inspect } from 'node:util'
import { outputSymbols } from '../lib/symbols.ts'
import { formatDuration, formatReport } from '../test/lib/report.ts'
import type { ReportLine } from '../test/lib/report.ts'
import type { TestFn } from '../test/lib/util.ts'

const testDirs = ['test', 'test/internals']

interface TestCase { file: string, name: string, fn: TestFn }
interface Failure { file: string, name: string, err: unknown }

function findTestFiles (): string[] {
  return testDirs.flatMap(dir => fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => path.join(dir, entry.name))
    .sort()
  )
}

/* Resolves after the current turn of the event loop, once pending unhandled rejections have been emitted */
function nextTurn (): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}

function isTestMap (input: unknown): input is Map<string, TestFn | undefined> {
  return input instanceof Map
}

function formatError (err: unknown): string {
  const text = err instanceof Error ? (err.stack ?? err.message) : inspect(err)
  return text.split('\n').map(line => '     ' + line).join('\n')
}

const args = process.argv.slice(2)
const typecheck = args.includes('--typecheck')
const fileArgs = args.filter(arg => arg !== '--typecheck')
const files = fileArgs.length ? fileArgs : findTestFiles()
const { tick, cross } = outputSymbols()
const started = performance.now()
const reportLines: ReportLine[] = []

/* Errors thrown outside of a test, e.g. a rejected promise which a test did not await */
const strayErrors: unknown[] = []
process.on('uncaughtException', err => { strayErrors.push(err) })
process.on('unhandledRejection', reason => { strayErrors.push(reason) })

/* ---------------------------------------------------------------- type check */

if (typecheck) {
  const tscStarted = performance.now()
  const tsc = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { encoding: 'utf8' })
  const duration = formatDuration(performance.now() - tscStarted)
  if (tsc.status !== 0) {
    console.log(tsc.stdout + tsc.stderr)
    const lines = [
      { label: 'Type check', value: `failed (${duration}), see the errors above` },
      { label: 'Tests', value: 'not run' }
    ]
    console.log(formatReport('TEST REPORT', lines, false))
    process.exit(1)
  }
  reportLines.push({ label: 'Type check', value: `passed (${duration})` })
}

/* ---------------------------------------------------------------- load */

const tests: TestCase[] = []
const onlyTests: TestCase[] = []
const skipped: Array<{ file: string, name: string }> = []
const failures: Failure[] = []

for (const file of files) {
  try {
    const mod: Record<string, unknown> = await import(pathToFileURL(path.resolve(file)).href)
    const { test, only, skip } = mod
    if (!isTestMap(test) || !isTestMap(only) || !isTestMap(skip)) {
      throw new Error('A test module must export `test`, `only` and `skip` Maps')
    }
    for (const [name, fn] of test) if (fn) tests.push({ file, name, fn })
    for (const [name, fn] of only) if (fn) onlyTests.push({ file, name, fn })
    for (const [name] of skip) skipped.push({ file, name })
  } catch (err) {
    failures.push({ file, name: '(failed to load)', err })
  }
}

/* ---------------------------------------------------------------- run */

const toRun = onlyTests.length ? onlyTests : tests
let passed = 0

/* Results are grouped by file: the file's tests, then its skipped tests */
for (const file of files) {
  const fileTests = toRun.filter(t => t.file === file)
  const fileSkipped = skipped.filter(t => t.file === file)
  if (!fileTests.length && !fileSkipped.length) continue
  console.log(`\n${chalk.bold(file)}`)
  for (const testCase of fileTests) {
    const testStarted = performance.now()
    const strayBefore = strayErrors.length
    let err: unknown
    let failed = false
    try {
      await testCase.fn()
    } catch (e) {
      err = e
      failed = true
    }
    /* Let the event loop turn, so that an unhandled rejection caused by the test is reported now */
    await nextTurn()
    if (!failed && strayErrors.length > strayBefore) {
      /* Attribute the error to this test rather than reporting it as stray */
      err = strayErrors.splice(strayBefore)[0]
      failed = true
    }
    const duration = chalk.dim(`(${formatDuration(performance.now() - testStarted)})`)
    if (failed) {
      failures.push({ file, name: testCase.name, err })
      console.log(`  ${chalk.red(`${cross} ${testCase.name}`)} ${duration}`)
    } else {
      passed++
      console.log(`  ${chalk.green(tick)} ${testCase.name} ${duration}`)
    }
  }
  for (const { name } of fileSkipped) {
    console.log(`  ${chalk.yellow('~')} ${chalk.dim(`${name} (skipped)`)}`)
  }
}

/* ---------------------------------------------------------------- report */

/* Collect any errors still pending from the last test */
await nextTurn()

if (failures.length) {
  console.log(chalk.red.bold(`\nFailures (${failures.length}):`))
  failures.forEach(({ file, name, err }, i) => {
    console.log(`\n  ${i + 1}) ${file} > ${name}\n${formatError(err)}`)
  })
}
if (strayErrors.length) {
  console.log(chalk.red.bold(`\nErrors outside of any test (${strayErrors.length}):`))
  strayErrors.forEach((err, i) => { console.log(`\n  ${i + 1})\n${formatError(err)}`) })
}

const failedTests = failures.filter(f => f.name !== '(failed to load)').length
const failedFiles = failures.length - failedTests
reportLines.push(
  { label: 'Test files', value: failedFiles ? `${files.length} (${failedFiles} failed to load)` : files.length },
  { label: 'Tests', value: toRun.length + skipped.length },
  { label: 'Passed', value: passed, indent: true },
  { label: 'Failed', value: failedTests, indent: true },
  { label: 'Skipped', value: skipped.length, indent: true }
)
if (onlyTests.length) {
  reportLines.push({ label: 'Not run', value: `${tests.length} (only the tests marked "only" were run)`, indent: true })
}
if (strayErrors.length) {
  reportLines.push({ label: 'Errors', value: `${strayErrors.length} outside of any test` })
}
reportLines.push({ label: 'Duration', value: formatDuration(performance.now() - started) })

const ok = failures.length === 0 && strayErrors.length === 0
console.log(formatReport('TEST REPORT', reportLines, ok))
process.exitCode = ok ? 0 : 1
