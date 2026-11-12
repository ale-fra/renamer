/*
 * Documentation checks: keep the Markdown docs in step with the code.
 */
import { createSuite } from './lib/util.ts'
import { optionDefinitions } from '../lib/cli-options.ts'
import FindReplace from '../lib/chain/find-replace.ts'
import IndexReplace from '../lib/chain/index-replace.ts'
import { strict as a } from 'node:assert'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const { test, only, skip } = createSuite()

const docs = ['README.md', 'TODO.md', 'docs/API.md', 'docs/release-notes-v6.md', 'example/README.md']
const read = (file: string): string => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

/* Remove fenced code blocks, so their contents are not mistaken for prose. */
function prose (markdown: string): string {
  return markdown.replace(/^```[\s\S]*?^```/gm, '')
}

/* Approximates GitHub's heading anchors: lower-case, punctuation removed, spaces to hyphens. */
function headingAnchors (markdown: string): Set<string> {
  const anchors = new Set<string>()
  const counts = new Map<string, number>()
  for (const [, heading = ''] of prose(markdown).matchAll(/^#{1,6} (.+)$/gm)) {
    const slug = heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-')
    const count = counts.get(slug) ?? 0
    anchors.add(count ? `${slug}-${count}` : slug)
    counts.set(slug, count + 1)
  }
  return anchors
}

interface CodeBlock { doc: string, lang: string, code: string }

function codeBlocks (doc: string): CodeBlock[] {
  return [...read(doc).matchAll(/^```(\w+)\n([\s\S]*?)^```/gm)]
    .map(([, lang = '', code = '']) => ({ doc, lang, code }))
}

/* The exported names documented under their own heading: types, plus the named runtime exports */
function exportedNames (): string[] {
  const types = [...read('lib/types.ts').matchAll(/^export (?:type|interface) (\w+)/gm)].map(m => m[1] ?? '')
  const runtime = [...read('index.ts').matchAll(/^export \{ default as (\w+) \}/gm)].map(m => m[1] ?? '')
  return [...types, ...runtime]
}

test.set('API.md documents every export, and only those', function () {
  const exported = exportedNames()
  const documented = [...read('docs/API.md').matchAll(/^### `(\w+)`$/gm)].map(m => m[1] ?? '')
  a.deepEqual(exported.filter(name => !documented.includes(name)), [], 'exported but not documented')
  a.deepEqual(documented.filter(name => !exported.includes(name)), [], 'documented but not exported')
})

test.set('relative links and anchors resolve', function () {
  const broken: string[] = []
  for (const doc of docs) {
    for (const [, target = ''] of prose(read(doc)).matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:/i.test(target)) continue /* external: not checked, no network */
      const [file = '', anchor] = target.split('#')
      const targetFile = file ? path.join(path.dirname(doc), file) : doc
      if (!fs.existsSync(targetFile)) {
        broken.push(`${doc}: ${target} (no such file)`)
      } else if (anchor && !headingAnchors(read(targetFile)).has(anchor)) {
        broken.push(`${doc}: ${target} (no such heading)`)
      }
    }
  }
  a.deepEqual(broken, [])
})

test.set('complete code examples compile', function () {
  /* Blocks with an import statement are complete examples; others are signatures or fragments. */
  const examples = docs.flatMap(codeBlocks)
    .filter(block => ['ts', 'js'].includes(block.lang) && /^import /m.test(block.code))
  a.ok(examples.length >= 8, `expected at least 8 examples, found ${examples.length}`)

  const outDir = 'tmp/docs-check'
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  const tsFiles: string[] = []
  const failures: string[] = []
  examples.forEach((block, i) => {
    const file = path.join(outDir, `${block.doc.replace(/\W/g, '-')}-${i}.${block.lang}`)
    /* `renamer` resolves to the sources via the `paths` setting in tsconfig.json */
    fs.writeFileSync(file, block.code)
    if (block.lang === 'ts') {
      tsFiles.push(path.basename(file))
    } else {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
      if (result.status !== 0) failures.push(`${file}: ${result.stderr}`)
    }
  })

  fs.writeFileSync(path.join(outDir, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.json',
    compilerOptions: { noUnusedLocals: false },
    include: [...tsFiles, '../../types/**/*.d.ts']
  }))
  const tsc = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', outDir], { encoding: 'utf8' })
  if (tsc.status !== 0) failures.push(tsc.stdout + tsc.stderr)
  a.deepEqual(failures, [])
})

interface ApiSection { name: string, body: string }

/* The sections of API.md, split at each h2 or h3 heading */
function apiSections (): ApiSection[] {
  return read('docs/API.md').split(/^(?=##+ )/m).map(body => {
    const [, name = ''] = /^##+ `?(\w+)/.exec(body) ?? []
    return { name, body }
  })
}

/* The names in the first column of a section's member table */
function tableMembers (body: string): string[] | undefined {
  const table = /^\| (?:Property|Option|Method|Event) \|.*\n\|[- |]+\n((?:\|.*\n?)+)/m.exec(body)
  if (!table) return undefined
  return (table[1] ?? '').trim().split('\n')
    .map(row => /^\| `(\w+)/.exec(row)?.[1])
    .filter((name): name is string => name !== undefined)
}

test.set('API.md signatures and member tables match the code', function () {
  /* Compiled, so that each check is made by the type checker itself */
  const lines = [
    "import type Renamer from 'renamer'",
    `import type { ${exportedNames().join(', ')} } from 'renamer'`,
    'type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false',
    '/* The keys of T, without index signatures */',
    'type KnownKeys<T> = keyof { [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K] }'
  ]
  let signatures = 0
  let tables = 0
  for (const { name, body } of apiSections()) {
    /* Signature blocks: TypeScript declarations without imports. Each must be identical to the real one. */
    for (const [, code = ''] of body.matchAll(/^```ts\n([\s\S]*?)^```/gm)) {
      if (/^import /m.test(code)) continue
      for (const [, kind = '', declared = ''] of code.matchAll(/^(type|interface|class) (\w+)/gm)) {
        const docName = `Doc${declared}`
        let declaration = code.replace(new RegExp(`^${kind} ${declared}\\b`, 'm'), `${kind} ${docName}`)
        if (kind === 'class') declaration = 'declare ' + declaration
        lines.push(declaration, `export const signature${declared}: Equals<${docName}, ${declared}> = true`)
        signatures++
      }
    }
    /* Member tables: must list exactly the members of the type or class */
    const members = tableMembers(body)
    if (members && exportedNames().includes(name)) {
      const isClass = read('index.ts').includes(`export { default as ${name} }`)
      const keys = isClass ? `KnownKeys<InstanceType<typeof ${name}>>` : `KnownKeys<${name}>`
      /* The CliOptions table lists only the options added to RenamerOptions */
      const compared = name === 'CliOptions' ? `Exclude<${keys}, keyof RenamerOptions>` : keys
      const listed = members.map(member => `'${member}'`).join(' | ')
      lines.push(`export const table${name}: Equals<${compared}, ${listed}> = true`)
      tables++
    }
  }
  a.ok(signatures >= 10, `expected at least 10 signatures, found ${signatures}`)
  a.ok(tables >= 10, `expected at least 10 tables, found ${tables}`)

  const outDir = 'tmp/docs-signatures'
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'signatures.ts'), lines.join('\n') + '\n')
  fs.writeFileSync(path.join(outDir, 'tsconfig.json'), JSON.stringify({
    extends: '../../tsconfig.json',
    compilerOptions: { noUnusedLocals: false },
    include: ['signatures.ts', '../../types/**/*.d.ts']
  }))
  const tsc = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', outDir], { encoding: 'utf8' })
  a.equal(tsc.status, 0, tsc.stdout + tsc.stderr)
})

test.set('example/README.md links every example file and has a command to run each', function () {
  const readme = read('example/README.md')
  const exampleFiles = ['api', 'chain', 'view'].flatMap(dir => fs.readdirSync(path.join('example', dir)).map(file => `${dir}/${file}`))
  a.deepEqual(exampleFiles.filter(file => !readme.includes(`](${file})`)), [], 'example files not linked')
  /* Run commands use the JavaScript version; the TypeScript version is the same command with .ts */
  const jsFiles = exampleFiles.filter(file => file.endsWith('.js'))
  const commands = [...readme.matchAll(/^\| [\w -]+\| `([^`]+)` \|$/gm)].map(m => m[1] ?? '')
  a.deepEqual(jsFiles.filter(file => !commands.some(command => command.includes(`example/${file}`))), [], 'examples without a run command')
})

test.set('command-line options mentioned in the docs exist', function () {
  const known = new Set([
    ...optionDefinitions,
    ...new FindReplace().optionDefinitions(),
    ...new IndexReplace().optionDefinitions()
  ].map(def => def.name))
  /* Defined by the example plugins and renamer-case, or generic */
  for (const name of ['suffix', 'case', 'option']) known.add(name)

  const unknown: string[] = []
  for (const doc of docs) {
    /* Skip npm commands, e.g. `npm install --global renamer` */
    const lines = read(doc).split('\n').filter(line => !/\bnpm /.test(line))
    for (const [, name = ''] of lines.join('\n').matchAll(/(?<![\w-])--([a-z][\w-]*)/g)) {
      if (!known.has(name)) unknown.push(`${doc}: --${name}`)
    }
  }
  a.deepEqual([...new Set(unknown)], [])
})

export { test, only, skip }
