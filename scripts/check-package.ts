/* Verify the tarball as an independent JavaScript/TypeScript consumer. */
import { strict as a } from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const projectRoot = process.cwd()
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('Run this check with `npm run test:package`.')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'renamer-package-'))

function run (args: string[], cwd: string): string {
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120_000 })
  a.equal(result.status, 0, `${args.join(' ')}\n${result.error ?? ''}\n${result.stdout}\n${result.stderr}`)
  return result.stdout
}

try {
  const packages = JSON.parse(run([npmCli, 'pack', '--json', '--pack-destination', tempDir], projectRoot)) as Array<{
    filename: string
    files: Array<{ path: string }>
  }>
  const packed = packages[0]
  a.ok(packed)
  a.ok(packed.files.some(file => file.path === 'dist/index.d.ts'))
  a.ok(packed.files.every(file => file.path.startsWith('dist/') || ['package.json', 'README.md', 'LICENCE'].includes(file.path)))

  const consumer = path.join(tempDir, 'consumer')
  fs.mkdirSync(consumer)
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  run([npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(tempDir, packed.filename)], consumer)
  a.ok(!fs.existsSync(path.join(consumer, 'node_modules', 'typescript')), 'consumer must not need the build toolchain')

  fs.writeFileSync(path.join(consumer, 'check.mjs'), `
import { strict as a } from 'node:assert'
import fs from 'node:fs'
import Renamer, { FindReplace, IndexReplace, DefaultView, LongView, DiffView, OneLineView } from 'renamer'
for (const Class of [FindReplace, IndexReplace, DefaultView, LongView, DiffView, OneLineView]) a.equal(typeof Class, 'function')
fs.writeFileSync('one file.jpg', 'original content')
const results = await new Renamer().rename({ files: ['one file.jpg'], pathElement: 'ext', replace: '.png', dryRun: true })
a.deepEqual(results, [{ from: 'one file.jpg', to: 'one file.png', renamed: true }])
a.ok(fs.existsSync('one file.jpg'))
`)
  run(['check.mjs'], consumer)
  const help = run([npmCli, 'exec', '--offline', '--', 'renamer', '--help'], consumer)
  a.match(help, /Synopsis/)
  run([npmCli, 'exec', '--offline', '--', 'renamer', '--path-element', 'ext', '--replace', '.png', 'one file.jpg'], consumer)
  a.ok(!fs.existsSync(path.join(consumer, 'one file.jpg')))
  a.equal(fs.readFileSync(path.join(consumer, 'one file.png'), 'utf8'), 'original content')

  fs.writeFileSync(path.join(consumer, 'check.ts'), `
import Renamer, { FindReplace, DefaultView } from 'renamer'
import type { Plugin, RenamerOptions, ReplaceResult, View, ViewWriteArgs } from 'renamer'
const plugin: Plugin = new FindReplace()
const view: View = new DefaultView()
const options: RenamerOptions = { files: ['one file.png'], dryRun: true, chain: [plugin], replace: 'two.png' }
const results: ReplaceResult[] = await new Renamer().rename(options)
for (const result of results) {
  if (result.renamed) { const target: string = result.to; console.log(target) }
  else { const target: null = result.to; console.log(target) }
}
const event: ViewWriteArgs = ['complete', { total: 1, renamed: 1, notRenamed: 0 }]
view.write(...event)
`)
  fs.writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: 'es2023', module: 'nodenext', types: [], skipLibCheck: false },
    files: ['check.ts']
  }))
  run([path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], consumer)
  console.log('Package checks passed: tarball contents, isolated install, public exports, CLI help, real rename and strict consumer types.')
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
