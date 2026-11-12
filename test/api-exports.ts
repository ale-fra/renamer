import Renamer, { DefaultView, DiffView, FindReplace, IndexReplace, LongView, OneLineView } from '../index.ts'
import type { ReplaceOptions, ReplaceResult } from '../index.ts'
import CliApp from '../lib/cli-app.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

const testRoot = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(testRoot, { recursive: true, force: true })
let index = 0

test.set('named exports are the built-in classes used by the CLI', async function () {
  const exported = { long: LongView, diff: DiffView, 'one-line': OneLineView }
  for (const [name, ViewClass] of Object.entries(exported)) {
    index++
    const fixturePath = createFixture(`${testRoot}/${index}/one`)
    const cliApp = new CliApp()
    await cliApp.start({ argv: ['-s', '-d', '-f', 'one', '-r', 'two', fixturePath, '--view', name] })
    a.ok(cliApp.view instanceof ViewClass, name)
  }
  a.ok(new CliApp().view instanceof DefaultView)
})

test.set('built-in plugins can be used in a chain', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  const results = await new Renamer().rename({
    files: [fixturePath],
    chain: [FindReplace, new IndexReplace()],
    find: 'one',
    replace: 'two-{{index}}',
    dryRun: true
  })
  a.equal(results[0]?.to, path.join(testRoot, String(index), 'two-1'))
})

test.set('built-in plugins can be extended', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one.TXT`)
  /* A find-replace which also lower-cases the extension */
  class FindReplaceLowerExt extends FindReplace {
    override replace (filePath: string, options: ReplaceOptions = {}): string {
      const output = path.parse(super.replace(filePath, options))
      return path.join(output.dir, output.name + output.ext.toLowerCase())
    }
  }
  const results = await new Renamer().rename({ files: [fixturePath], chain: [FindReplaceLowerExt], find: 'one', replace: 'two', dryRun: true })
  a.equal(results[0]?.to, path.join(testRoot, String(index), 'two.txt'))
})

test.set('built-in views can be extended', async function () {
  index++
  const fixturePath = createFixture(`${testRoot}/${index}/one`)
  /* Redirect the default view's output */
  class CollectingView extends DefaultView {
    lines: string[] = []
    override log (line?: string): void {
      this.lines.push(line ?? '')
    }

    /* Show unchanged files too, regardless of --verbose */
    override logResult (result: ReplaceResult): void {
      super.logResult(result, { verbose: true })
    }
  }
  const view = new CollectingView()
  await new CliApp({ view }).start({ argv: ['-d', '-f', 'qqq', '-r', 'two', fixturePath] })
  a.ok(view.lines.some(line => line.includes(fixturePath)))
  a.ok(view.lines.some(line => /Rename complete: 0 of 1 files renamed/.test(line)))
})

export { test, only, skip }
