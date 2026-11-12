import DefaultView from '../../lib/view/default.ts'
import LongView from '../../lib/view/long.ts'
import DiffView from '../../lib/view/diff.ts'
import OneLineView from '../../lib/view/one-line.ts'
import chalk from 'chalk'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

/*
 * Colour support and Unicode symbols are auto-detected from the environment (no colour
 * without a TTY, ASCII symbols without a UTF-8 locale), so set both explicitly.
 */
function withColourLevel (level: 0 | 1, fn: () => void, locale = 'C.UTF-8'): void {
  const origLevel = chalk.level
  const origLocale = process.env.LC_ALL
  chalk.level = level
  process.env.LC_ALL = locale
  try {
    fn()
  } finally {
    chalk.level = origLevel
    if (origLocale === undefined) {
      delete process.env.LC_ALL
    } else {
      process.env.LC_ALL = origLocale
    }
  }
}

/* Capture the lines a view logs. */
function capture<T extends { log (line?: string): void }> (view: T): { view: T, lines: string[] } {
  const lines: string[] = []
  view.log = (line?: string) => { lines.push(line ?? '') }
  return { view, lines }
}

const renamed = { from: 'one', to: 'two', renamed: true } as const
const unchanged = { from: 'one', to: null, renamed: false } as const
const tick = process.platform === 'win32' ? '√' : '✔︎'
const cross = process.platform === 'win32' ? '×' : '✖'
const stats = { total: 2, renamed: 1, notRenamed: 1 }

test.set('default view: createResultLine', function () {
  withColourLevel(1, () => {
    const view = new DefaultView()
    a.equal(view.createResultLine(renamed), `\u001b[32m${tick}\u001b[39m one\u001b[1m → \u001b[22mtwo `)
    a.equal(view.createResultLine(unchanged), `\u001b[31m${cross}\u001b[39m one `)
    a.equal(view.createResultLine({ ...unchanged, error: 'failed' }), `\u001b[31m${cross}\u001b[39m one (\u001b[31mfailed\u001b[39m)`)
  })
})

test.set('default view: write events', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DefaultView())
    view.write('info', 'Dry run', {})
    view.write('start', null, {})
    view.write('result', renamed, {})
    view.write('result', unchanged, {})
    view.write('complete', stats, {})
    view.write('usage', 'USAGE', {})
    view.write('error', new Error('broken'), {})
    a.deepEqual(lines, [
      '', 'Dry run', '',
      `${tick} one → two `,
      '\nRename complete: 1 of 2 files renamed.\n',
      'USAGE',
      'ERROR: broken',
      '\nRun `renamer --help` for usage instructions.\n'
    ])
  })
})

test.set('default view: verbose also logs unchanged files', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DefaultView())
    view.write('result', unchanged, { verbose: true })
    a.deepEqual(lines, [`${cross} one `])
  })
})

test.set('default view: error with undefined options (command line not parsed)', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DefaultView())
    view.write('error', new Error('Unknown option: --broken'), undefined)
    a.deepEqual(lines, ['ERROR: Unknown option: --broken', '\nRun `renamer --help` for usage instructions.\n'])
  })
})

test.set('long view', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new LongView())
    view.write('result', renamed, {})
    view.write('result', unchanged, {})
    a.deepEqual(lines, ['Before:  one', 'After:   two', '--------'])
  })
})

test.set('long view: verbose', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new LongView())
    view.write('result', renamed, { verbose: true })
    view.write('result', unchanged, { verbose: true })
    a.deepEqual(lines, [
      `Renamed: ${tick}`, 'Before:  one', 'After:   two', '--------',
      `Renamed: ${cross}`, 'Before:  one', '--------'
    ])
  })
})

test.set('diff view', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DiffView())
    view.write('result', { from: 'one', to: 'ane', renamed: true }, {})
    view.write('result', unchanged, {})
    a.deepEqual(lines, ['Before:  one', 'After:   ane', 'Diff:    oane', '--------'])
  })
})

test.set('diff view: hunks are coloured', function () {
  withColourLevel(1, () => {
    const { view, lines } = capture(new DiffView())
    view.write('result', { from: 'one', to: 'ane', renamed: true }, {})
    a.equal(lines[2], 'Diff:    \u001b[41mo\u001b[49m\u001b[42m\u001b[30ma\u001b[39m\u001b[49mne')
  })
})

test.set('diff view: verbose', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DiffView())
    view.write('result', { from: 'one', to: 'ane', renamed: true }, { verbose: true })
    view.write('result', unchanged, { verbose: true })
    a.deepEqual(lines, [
      `Renamed: ${tick}`, 'Before:  one', 'After:   ane', 'Diff:    oane', '--------',
      `Renamed: ${cross}`, 'Before:  one', '--------'
    ])
  })
})

test.set('one-line view: only the summary, usage and errors are logged', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new OneLineView())
    view.write('info', 'Dry run', {})
    view.write('start', null, {})
    view.write('result', renamed, {})
    view.write('complete', stats, {})
    view.write('complete', stats, { dryRun: true })
    view.write('usage', 'USAGE', {})
    view.write('error', new Error('broken'), {})
    a.deepEqual(lines, [
      'Rename complete: 1 of 2 files renamed.',
      'Dry run. Rename complete: 1 of 2 files renamed.',
      'USAGE',
      'ERROR: broken',
      '\nRun `renamer --help` for usage instructions.\n'
    ])
  })
})

test.set('one-line view: complete with undefined options', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new OneLineView())
    view.write('complete', stats, undefined)
    a.deepEqual(lines, ['Rename complete: 1 of 2 files renamed.'])
  })
})

test.set('default view: ASCII symbols when the locale is not UTF-8', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new DefaultView())
    view.write('result', renamed, { verbose: true })
    view.write('result', unchanged, { verbose: true })
    a.deepEqual(lines, ['+ one -> two ', '- one '])
  }, 'C')
})

test.set('long view: ASCII symbols when the locale is not UTF-8', function () {
  withColourLevel(0, () => {
    const { view, lines } = capture(new LongView())
    view.write('result', unchanged, { verbose: true })
    a.deepEqual(lines, ['Renamed: -', 'Before:  one', '--------'])
  }, 'C')
})

export { test, only, skip }
