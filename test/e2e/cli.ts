/*
 * End-to-end test of the renamer command as built for publishing (dist/bin/cli.js),
 * run as a separate process exactly as a user would run it.
 *
 * Usage: npm run test:e2e   (builds first, then runs this script)
 *
 * The test directory is kept afterwards so the results can be checked by hand.
 * This script's own output is ASCII only, so it displays correctly in any terminal.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { formatDuration, formatReport } from '../lib/report.ts'

const started = performance.now()

const cli = path.resolve('dist/bin/cli.js')
if (!fs.existsSync(cli)) {
  console.error(`${cli} not found: run \`npm run build\` first, or use \`npm run test:e2e\`.`)
  process.exit(1)
}

/* ------------------------------------------------------------------ helpers */

interface Check { description: string, passed: boolean, detail?: string }
const checks: Check[] = []

function check (description: string, passed: boolean, detail?: string): void {
  checks.push({ description, passed, detail })
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${description}${!passed && detail ? `\n         ${detail}` : ''}`)
}

function heading (text: string): void {
  console.log(`\n== ${text} ${'='.repeat(Math.max(0, 74 - text.length))}\n`)
}

const naturalOrder = new Intl.Collator('en', { numeric: true }).compare
function listDir (dir: string): string[] {
  return fs.readdirSync(dir).sort(naturalOrder)
}

/* Run the CLI in the test directory. Colour is disabled so the output can be parsed. */
function renamer (args: string[], env: NodeJS.ProcessEnv = {}): { status: number | null, output: string } {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: testDir,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', ...env }
  })
  return { status: result.status, output: result.stdout + result.stderr }
}

/* The renames listed in the output, e.g. `✔︎ file1.jpg → photo-1.jpg` or `+ file1.jpg -> photo-1.jpg` */
function listedRenames (output: string): Map<string, string> {
  const renames = new Map<string, string>()
  for (const [, from = '', to = ''] of output.matchAll(/^\S+ (\S+) (?:\u2192|->) (\S+)\s*$/gm)) {
    renames.set(from, to)
  }
  return renames
}

function sameRenames (actual: Map<string, string>, expected: Map<string, string>): boolean {
  return actual.size === expected.size && [...expected].every(([from, to]) => actual.get(from) === to)
}

function indent (text: string): string {
  return text.trimEnd().split('\n').map(line => '    | ' + line).join('\n')
}

const isAscii = (text: string): boolean => [...text].every(char => char.charCodeAt(0) < 128)

/* ------------------------------------------------------------------ setup */

const fileCount = 10
const originals = Array.from({ length: fileCount }, (_, i) => `file${i + 1}.jpg`)
const expected = new Map(originals.map((file, i) => [file, `photo-${i + 1}.jpg`]))
const args = ['--path-element', 'name', '--replace', 'photo-{{index}}', '*.jpg']
const commandLine = 'renamer --path-element name --replace "photo-{{index}}" "*.jpg"'

heading('Setup')
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'renamer-e2e-'))
for (const file of originals) {
  /* Each file records its original name, to check it was renamed to the right target */
  fs.writeFileSync(path.join(testDir, file), `original name: ${file}\n`)
}
const locale = ['LC_ALL', 'LC_CTYPE', 'LANG'].map(name => `${name}=${process.env[name] ?? ''}`).join(' ')
console.log(`  CLI under test:  node ${path.relative(process.cwd(), cli)}`)
console.log(`  Node.js:         ${process.version}`)
console.log(`  Your locale:     ${locale}`)
console.log(`  Test directory:  ${testDir}`)
check(`Created ${fileCount} files in an isolated temporary directory`, listDir(testDir).length === fileCount)

heading('Expected renames')
console.log(`  Command: ${commandLine}\n`)
for (const [from, to] of expected) {
  console.log(`    ${from.padEnd(11)} -> ${to}`)
}
console.log('\n  file10.jpg must become photo-10.jpg: files are numbered in natural order.')

/* ------------------------------------------------------------------ dry run */

heading('1. Dry run')
const dryRun = renamer(['--dry-run', ...args])
console.log(`  $ ${commandLine.replace('renamer', 'renamer --dry-run')}\n`)
console.log(indent(dryRun.output) + '\n')
check('Dry run: exit code is 0', dryRun.status === 0, `exit code: ${dryRun.status}`)
check('Dry run: output is marked "Dry run"', /^Dry run$/m.test(dryRun.output))
check(`Dry run: output lists exactly the ${fileCount} expected renames`, sameRenames(listedRenames(dryRun.output), expected),
  `listed: ${JSON.stringify([...listedRenames(dryRun.output)])}`)
check(`Dry run: summary reports ${fileCount} of ${fileCount} renamed`, dryRun.output.includes(`Rename complete: ${fileCount} of ${fileCount} files renamed.`))
check('Dry run: the original files are all still there, unchanged', JSON.stringify(listDir(testDir)) === JSON.stringify(originals),
  `directory contains: ${listDir(testDir).join(', ')}`)

heading('2. Output symbols (the terminal encoding fix)')
const unicodeRun = renamer(['--dry-run', ...args], { LC_ALL: 'C.UTF-8' })
const asciiRun = renamer(['--dry-run', ...args], { LC_ALL: 'C' })
console.log('  Dry run again with a UTF-8 locale, then with the C locale (as in a terminal with no locale set).\n')
check('UTF-8 locale: Unicode symbols are used (the arrow is U+2192)', unicodeRun.status === 0 && unicodeRun.output.includes('file1.jpg \u2192 photo-1.jpg'))
check('C locale: the output is plain ASCII (file1.jpg -> photo-1.jpg)', asciiRun.status === 0 && isAscii(asciiRun.output) && asciiRun.output.includes('file1.jpg -> photo-1.jpg'))
check('Neither run renamed anything', JSON.stringify(listDir(testDir)) === JSON.stringify(originals))

/* ------------------------------------------------------------------ real run */

heading('3. Rename')
const realRun = renamer(args)
console.log(`  $ ${commandLine}\n`)
console.log(indent(realRun.output) + '\n')
check('Rename: exit code is 0', realRun.status === 0, `exit code: ${realRun.status}`)
check(`Rename: output lists exactly the ${fileCount} expected renames`, sameRenames(listedRenames(realRun.output), expected))
check(`Rename: summary reports ${fileCount} of ${fileCount} renamed`, realRun.output.includes(`Rename complete: ${fileCount} of ${fileCount} files renamed.`))

const after = listDir(testDir)
check(`The directory now contains exactly photo-1.jpg to photo-${fileCount}.jpg`, JSON.stringify(after) === JSON.stringify([...expected.values()]),
  `directory contains: ${after.join(', ')}`)
check('None of the original file names remain', originals.every(file => !fs.existsSync(path.join(testDir, file))))
const misplaced = [...expected].filter(([from, to]) => {
  const target = path.join(testDir, to)
  return !fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== `original name: ${from}\n`
})
check('Each file was renamed to the right name (checked by file content)', misplaced.length === 0,
  `wrong content in: ${misplaced.map(([, to]) => to).join(', ')}`)

/* ------------------------------------------------------------------ recap */

heading('Recap')
const failed = checks.filter(c => !c.passed)
checks.forEach((c, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. [${c.passed ? 'PASS' : 'FAIL'}] ${c.description}`)
})
console.log('\n  The test directory has been kept so you can verify the results by hand:\n')
console.log(`    ls -l ${testDir}`)
console.log(`    head ${path.join(testDir, 'photo-10.jpg')}    # should contain: original name: file10.jpg`)
console.log(`\n  Remove it when done:  rm -r ${testDir}`)

console.log(formatReport('END-TO-END TEST REPORT', [
  { label: 'CLI under test', value: `node ${path.relative(process.cwd(), cli)} (Node.js ${process.version})` },
  { label: 'Scenario', value: `${fileCount} files: dry run, symbol checks, then rename` },
  { label: 'Checks', value: checks.length },
  { label: 'Passed', value: checks.length - failed.length, indent: true },
  { label: 'Failed', value: failed.length, indent: true },
  { label: 'Duration', value: formatDuration(performance.now() - started) },
  { label: 'Test directory', value: `${testDir} (kept)` }
], failed.length === 0))

process.exitCode = failed.length ? 1 : 0
