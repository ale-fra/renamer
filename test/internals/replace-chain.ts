import ReplaceChain from '../../lib/replace-chain.ts'
import FindReplace from '../../lib/chain/find-replace.ts'
import IndexReplace from '../../lib/chain/index-replace.ts'
import { createSuite } from '../lib/util.ts'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()

test.set('string find', async function () {
  const file = 'one'
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: 'one', replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, 'one')
  a.deepEqual(result.to, 'yeah')
  a.deepEqual(result.renamed, true)
})

test.set('string find, sub-dir', async function () {
  const file = path.join('dir', 'one')
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: 'one', replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, path.join('dir', 'one'))
  a.deepEqual(result.to, path.join('dir', 'yeah'))
  a.deepEqual(result.renamed, true)
})

test.set('regexp, sub-dir, unchanged', async function () {
  const file = path.join('one', 'two')
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: /one/g, replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, path.join('one', 'two'))
  a.deepEqual(result.to, null)
  a.deepEqual(result.renamed, false)
})

test.set('regexp, sub-dir', async function () {
  const file = path.join('two', '/one one')
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: /one/g, replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, path.join('two', '/one one'))
  a.deepEqual(result.to, path.join('two', 'yeah yeah'))
  a.deepEqual(result.renamed, true)
})

test.set('regexp', async function () {
  const file = 'one'
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: /one/g, replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, 'one')
  a.deepEqual(result.to, 'yeah')
  a.deepEqual(result.renamed, true)
})

test.set('replace function', async function () {
  const file = 'one'
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { find: /one/g, replace: () => 'yeah' }, 0, [file])
  a.deepEqual(result.from, 'one')
  a.deepEqual(result.to, 'yeah')
  a.deepEqual(result.renamed, true)
})

test.set('regexp, replace function', async function () {
  const file = 'one-two'
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, {
    find: /(\w+)-(\w+)/,
    replace: function (match: string, p1: string, p2: string) {
      return `${p1}__${p2}`
    }
  }, 0, [file])
  a.deepEqual(result.from, 'one-two')
  a.deepEqual(result.to, 'one__two')
  a.deepEqual(result.renamed, true)
})

test.set('empty find', async function () {
  const file = 'one'
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, 'one')
  a.deepEqual(result.to, 'yeah')
  a.deepEqual(result.renamed, true)
})

test.set('empty find, sub-directory', async function () {
  const file = path.join('one', 'one')
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  const result = chain.replace(file, { replace: 'yeah' }, 0, [file])
  a.deepEqual(result.from, path.join('one', 'one'))
  a.deepEqual(result.to, path.join('one', 'yeah'))
  a.deepEqual(result.renamed, true)
})

test.set('custom plugins', async function () {
  class PluginOne {
    replace (file: string) {
      return file.replace('one', '{{one}}')
    }
  }
  class PluginTwo {
    replace (file: string) {
      return file.replace('two', '2')
    }
  }
  const file = 'a-one-two'
  const chain = new ReplaceChain()
  await chain.loadPlugins([PluginOne, PluginTwo])
  const result = chain.replace(file, { find: 'a', replace: 'b' }, 0, ['a-one-two'])
  a.deepEqual(result.from, file)
  a.deepEqual(result.to, 'a-{{one}}-2')
  a.deepEqual(result.renamed, true)
})

test.set('custom plugins plus a built-in', async function () {
  class PluginOne {
    replace (file: string) {
      return file.replace('one', '{{one}}')
    }
  }
  class PluginTwo {
    replace (file: string) {
      return file.replace('two', '2')
    }
  }
  const file = 'a-one-two'
  const chain = new ReplaceChain()
  await chain.loadPlugins(['find-replace.js', PluginOne, PluginTwo])
  const result = chain.replace(file, { find: 'a', replace: 'b' }, 0, ['a-one-two'])
  a.deepEqual(result.from, file)
  a.deepEqual(result.to, 'b-{{one}}-2')
  a.deepEqual(result.renamed, true)
})

test.set('custom plugins plus a relative local path plugin', async function () {
  class PluginOne {
    replace (file: string) {
      return file.replace('index:', 'bindex:')
    }
  }
  const chain = new ReplaceChain()
  await chain.loadPlugins(['test/lib/dummy-plugin.ts', PluginOne])
  const result = chain.replace('start', {}, 0, [])
  a.deepEqual(result.from, 'start')
  a.deepEqual(result.to, 'file: start, bindex: 0, file count: 0')
  a.deepEqual(result.renamed, true)
})

test.set('default chain: find-replace then index-replace', async function () {
  const chain = new ReplaceChain()
  await chain.loadPlugins()
  a.ok(chain.plugins[0] instanceof FindReplace)
  a.ok(chain.plugins[1] instanceof IndexReplace)
  a.equal(chain.plugins.length, 2)
  await chain.loadPlugins([])
  a.equal(chain.plugins.length, 2)
})

test.set('built-in plugins by file name', async function () {
  const chain = new ReplaceChain()
  await chain.loadPlugins(['index-replace.js', './find-replace.js', 'find-replace.ts'])
  a.ok(chain.plugins[0] instanceof IndexReplace)
  a.ok(chain.plugins[1] instanceof FindReplace)
  a.ok(chain.plugins[2] instanceof FindReplace)
})

test.set('plugin instances are used as-is', async function () {
  const plugin = { replace: (file: string) => file + '.bak' }
  const chain = new ReplaceChain()
  await chain.loadPlugins([plugin])
  a.equal(chain.plugins[0], plugin)
  a.deepEqual(chain.replace('one', {}, 0, ['one']), { from: 'one', to: 'one.bak', renamed: true })
})

test.set('plugin returning a non-string throws', async function () {
  class Broken {
    replace (): string {
      return undefined as unknown as string
    }
  }
  const chain = new ReplaceChain()
  await chain.loadPlugins([Broken])
  a.throws(() => chain.replace('one', {}, 0, ['one']), /Invalid plugin: Broken.replace\(\) must return a string/)
})

test.set('empty chain: file unchanged', function () {
  const chain = new ReplaceChain()
  a.deepEqual(chain.replace('one', {}, 0, ['one']), { from: 'one', to: null, renamed: false })
})

test.set('invalid plugins rejected', async function () {
  const chain = new ReplaceChain()
  await a.rejects(() => chain.loadPlugins(['does-not-exist']), /plugin could not be found: does-not-exist/)
  await a.rejects(() => chain.loadPlugins(['test/lib/broken-view.ts']), /must implement a replace method/)
  // @ts-expect-error: invalid from JavaScript only
  await a.rejects(() => chain.loadPlugins([null]), /must implement a replace method/)
  await a.rejects(() => chain.loadPlugins(['./test/lib/util.ts']), /must export a class/)
})

export { test, only, skip }
