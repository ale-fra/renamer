import path from 'node:path'
import fs from 'node:fs'

/** Create a file (and any missing parent directories) containing the text `test`. */
function createFixture (filePath: string): string {
  const dirname = path.dirname(filePath)
  fs.mkdirSync(dirname, { recursive: true })
  fs.writeFileSync(filePath, 'test')
  return filePath
}

/** A test function, as run by scripts/test.ts. Tests must not rely on `this`. */
type TestFn = (this: void) => unknown

interface Suite {
  test: Map<string, TestFn>
  only: Map<string, TestFn>
  skip: Map<string, TestFn | undefined>
}

/** The `test`, `only` and `skip` maps each test module must export, see scripts/test.ts. */
function createSuite (): Suite {
  return { test: new Map(), only: new Map(), skip: new Map() }
}

export { createFixture, createSuite }
export type { TestFn, Suite }
