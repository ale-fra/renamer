import FindReplace from '../../lib/chain/find-replace.ts'
import { createSuite } from '../lib/util.ts'
import { strict as a } from 'node:assert'
import path from 'node:path'

const { test, only, skip } = createSuite()

test.set('string find', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace('one', { find: 'o', replace: 'a' }), 'ane')
})

test.set('regexp find, global', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace('ooo', { find: /o/g, replace: 'a' }), 'aaa')
})

test.set('only the base name is renamed, not the directory', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace(path.join('one', 'one'), { find: 'one', replace: 'two' }), path.join('one', 'two'))
})

test.set('replace function', function () {
  const plugin = new FindReplace()
  const replace = (match: string, p1: string, p2: string): string => `${p2}-${p1}`
  a.equal(plugin.replace('one-two', { find: /(\w+)-(\w+)/, replace }), 'two-one')
})

test.set('find omitted: whole base name replaced', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace(path.join('dir', 'one.txt'), { replace: 'two' }), path.join('dir', 'two'))
})

test.set('replace omitted: defaults to an empty string', function () {
  /* Previously the text "undefined" was inserted, e.g. `undefinedne` */
  const plugin = new FindReplace()
  a.equal(plugin.replace('one', { find: 'o' }), 'ne')
})

test.set('pathElement name', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace('one.txt', { find: /$/, replace: '-done', pathElement: 'name' }), 'one-done.txt')
})

test.set('pathElement ext', function () {
  const plugin = new FindReplace()
  a.equal(plugin.replace('one.txt', { find: /^\./, replace: '.done-', pathElement: 'ext' }), 'one.done-txt')
})

test.set('find omitted: the whole selected path element is replaced', function () {
  /* Previously only `base` worked; with `name` or `ext` nothing was renamed */
  const plugin = new FindReplace()
  a.equal(plugin.replace(path.join('dir', 'one.txt'), { replace: 'two', pathElement: 'name' }), path.join('dir', 'two.txt'))
  a.equal(plugin.replace(path.join('dir', 'one.txt'), { replace: '.md', pathElement: 'ext' }), path.join('dir', 'one.md'))
  a.equal(plugin.replace('.bashrc', { replace: '.bak', pathElement: 'ext' }), '.bashrc.bak')
})

test.set('invalid pathElement throws', function () {
  const plugin = new FindReplace()
  a.throws(
    // @ts-expect-error: an invalid path element is only possible from JavaScript or the CLI
    () => plugin.replace('one', { find: 'one', replace: 'two', pathElement: 'broken' }),
    /Invalid path element: broken/
  )
})

test.set('neither find nor replace throws', function () {
  const plugin = new FindReplace()
  a.throws(() => plugin.replace('one', {}), /Please specify a value/)
  a.throws(() => plugin.replace('one'), /Please specify a value/)
})

test.set('empty result throws', function () {
  const plugin = new FindReplace()
  a.throws(() => plugin.replace('one', { find: 'one', replace: '' }), /Replace resulted in empty filename/)
  a.throws(() => plugin.replace('one', { find: 'one', replace: '', pathElement: 'name' }), /Replace resulted in empty filename/)
})

export { test, only, skip }
