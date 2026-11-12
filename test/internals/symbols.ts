import { isUnicodeSupported, outputSymbols } from '../../lib/symbols.ts'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

test.set('UTF-8 locales support Unicode', function () {
  for (const locale of ['C.UTF-8', 'C.utf8', 'en_US.UTF-8', 'de_DE.utf8']) {
    a.equal(isUnicodeSupported({ LANG: locale }, 'linux'), true, locale)
  }
})

test.set('no locale, or a non-UTF-8 locale, does not support Unicode', function () {
  a.equal(isUnicodeSupported({}, 'linux'), false)
  a.equal(isUnicodeSupported({ LANG: '' }, 'darwin'), false)
  a.equal(isUnicodeSupported({ LANG: 'C' }, 'linux'), false)
  a.equal(isUnicodeSupported({ LANG: 'POSIX' }, 'linux'), false)
  a.equal(isUnicodeSupported({ LANG: 'en_US.ISO-8859-1' }, 'linux'), false)
})

test.set('precedence: LC_ALL, then LC_CTYPE, then LANG', function () {
  a.equal(isUnicodeSupported({ LC_ALL: 'C', LC_CTYPE: 'C.UTF-8', LANG: 'C.UTF-8' }, 'linux'), false)
  a.equal(isUnicodeSupported({ LC_CTYPE: 'C', LANG: 'C.UTF-8' }, 'linux'), false)
  a.equal(isUnicodeSupported({ LC_CTYPE: 'C.UTF-8', LANG: 'C' }, 'linux'), true)
  /* An empty variable counts as unset */
  a.equal(isUnicodeSupported({ LC_ALL: '', LANG: 'C.UTF-8' }, 'linux'), true)
})

test.set('the Linux virtual console does not support Unicode', function () {
  a.equal(isUnicodeSupported({ LANG: 'C.UTF-8', TERM: 'linux' }, 'linux'), false)
  a.equal(isUnicodeSupported({ LANG: 'C.UTF-8', TERM: 'xterm-256color' }, 'linux'), true)
})

test.set('symbols: Unicode, Windows and ASCII', function () {
  a.deepEqual(outputSymbols({ LANG: 'C.UTF-8' }, 'linux'), { tick: '✔︎', cross: '✖', arrow: '→', chainItem: '↓' })
  a.deepEqual(outputSymbols({}, 'win32'), { tick: '√', cross: '×', arrow: '→', chainItem: '↓' })
  a.deepEqual(outputSymbols({ LC_ALL: 'C' }, 'win32'), { tick: '+', cross: '-', arrow: '->', chainItem: '-' })
  const ascii = outputSymbols({}, 'linux')
  a.deepEqual(ascii, { tick: '+', cross: '-', arrow: '->', chainItem: '-' })
  /* eslint-disable-next-line no-control-regex */
  a.ok(Object.values(ascii).every(symbol => /^[\x00-\x7F]+$/.test(symbol)))
})

export { test, only, skip }
