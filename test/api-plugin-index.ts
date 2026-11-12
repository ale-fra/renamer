import Renamer from '../index.ts'
import { createFixture, createSuite } from './lib/util.ts'
import fs from 'node:fs'
import path from 'node:path'
import { strict as a } from 'node:assert'

const { test, only, skip } = createSuite()
let index = 0

const sectionFolder = `tmp/${path.basename(import.meta.url)}`
fs.rmSync(sectionFolder, { recursive: true, force: true })

test.set('simple', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    replace: '{{index}}'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/1`), true)
})

test.set('two files same depth, check index order matches input order', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  createFixture(`${testFolder}/one`)
  createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/two`, `${testFolder}/one`],
    find: /(.+)/,
    replace: '$1{{index}}'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/two1`), true)
  a.equal(fs.existsSync(`${testFolder}/one2`), true)
})

test.set('two files same depth, different order, check index order matches input order', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  createFixture(`${testFolder}/one`)
  createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/one`, `${testFolder}/two`],
    find: /(.+)/,
    replace: '$1{{index}}'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/one1`), true)
  a.equal(fs.existsSync(`${testFolder}/two2`), true)
})

test.set('with depth, check index order matches input order', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  createFixture(`${testFolder}/one`)
  createFixture(`${testFolder}/dir/one`)
  createFixture(`${testFolder}/dir/two`)
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/one`, `${testFolder}/dir/one`, `${testFolder}/dir/two`],
    find: 'e',
    replace: 'e{{index}}'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/dir/one`), false)
  a.equal(fs.existsSync(`${testFolder}/dir/two`), true)
  a.equal(fs.existsSync(`${testFolder}/one1`), true)
  a.equal(fs.existsSync(`${testFolder}/dir/one2`), true)
})

test.set('with depth, different order, check index order matches input order', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  createFixture(`${testFolder}/one`)
  createFixture(`${testFolder}/dir/one`)
  createFixture(`${testFolder}/dir/two`)
  const renamer = new Renamer()
  const options = {
    files: [`${testFolder}/dir/one`, `${testFolder}/one`, `${testFolder}/dir/two`],
    find: 'e',
    replace: 'e{{index}}'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/dir/one`), false)
  a.equal(fs.existsSync(`${testFolder}/dir/two`), true)
  a.equal(fs.existsSync(`${testFolder}/dir/one1`), true)
  a.equal(fs.existsSync(`${testFolder}/one2`), true)
})

test.set('--index-root 10', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    replace: '{{index}}',
    indexRoot: 10
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/10`), true)
})

test.set('--index-root 10, two input files', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2],
    replace: '{{index}}',
    indexRoot: 10
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/10`), true)
  a.equal(fs.existsSync(`${testFolder}/11`), true)
})

test.set('--index-root 0', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    replace: '{{index}}',
    indexRoot: '0'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
})

test.set('--index-root 0 (type number)', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath],
    replace: '{{index}}',
    indexRoot: 0
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
})

test.set('--index-root 0, two input files', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2],
    replace: '{{index}}',
    indexRoot: '0'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
  a.equal(fs.existsSync(`${testFolder}/1`), true)
})

test.set('--index-root 0 (type number), two input files', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2],
    replace: '{{index}}',
    indexRoot: 0
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
  a.equal(fs.existsSync(`${testFolder}/1`), true)
})

test.set('--index-root -10', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2],
    replace: '{{index}}',
    indexRoot: -10
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/-10`), true)
  a.equal(fs.existsSync(`${testFolder}/-9`), true)
})

test.set('--index-root -1, three input files', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const fixturePath3 = createFixture(`${testFolder}/three`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2, fixturePath3],
    replace: '{{index}}',
    indexRoot: '-1'
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/three`), false)
  a.equal(fs.existsSync(`${testFolder}/-1`), true)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
  a.equal(fs.existsSync(`${testFolder}/1`), true)
})

test.set('--index-root -1 (type number), three input files', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const fixturePath = createFixture(`${testFolder}/one`)
  const fixturePath2 = createFixture(`${testFolder}/two`)
  const fixturePath3 = createFixture(`${testFolder}/three`)
  const renamer = new Renamer()
  const options = {
    files: [fixturePath, fixturePath2, fixturePath3],
    replace: '{{index}}',
    indexRoot: -1
  }
  await renamer.rename(options)
  a.equal(fs.existsSync(`${testFolder}/one`), false)
  a.equal(fs.existsSync(`${testFolder}/two`), false)
  a.equal(fs.existsSync(`${testFolder}/three`), false)
  a.equal(fs.existsSync(`${testFolder}/-1`), true)
  a.equal(fs.existsSync(`${testFolder}/0`), true)
  a.equal(fs.existsSync(`${testFolder}/1`), true)
})

test.set('glob matches are processed in natural order, so numbering is predictable', async function () {
  /* Previously the order depended on the file system and varied between runs */
  const testFolder = path.join(sectionFolder, String(index++))
  const names = ['file10', 'file2', 'File3', 'file1', 'b/file3', 'a/file1', 'a/b/file1']
  for (const name of names) createFixture(`${testFolder}/${name}`)
  const renamer = new Renamer()
  for (let run = 0; run < 5; run++) {
    const results = await renamer.rename({ files: [`${testFolder}/**`], replace: '{{index}}', dryRun: true })
    a.deepEqual(results.map(r => path.relative(testFolder, r.from)), [
      'a/b/file1', 'a/file1', 'b/file3', 'file1', 'file2', 'File3', 'file10',
      /* then directories, deepest first */
      'a/b', 'a', 'b'
    ].map(name => path.normalize(name)))
  }
})

test.set('explicit paths are processed in the order given', async function () {
  const testFolder = path.join(sectionFolder, String(index++))
  const files = ['c', 'a', 'b'].map(name => createFixture(`${testFolder}/${name}`))
  const results = await new Renamer().rename({ files, replace: '{{index}}', dryRun: true })
  a.deepEqual(results.map(r => r.to), ['1', '2', '3'].map(n => path.join(testFolder, n)))
})

export { test, only, skip }
