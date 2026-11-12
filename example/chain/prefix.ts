import path from 'node:path'
import type { Plugin } from 'renamer'

/* Adds the prefix `[DONE] ` to each file name. */
class Prefix implements Plugin {
  replace (filePath: string): string {
    const file = path.parse(filePath)
    const newName = '[DONE] ' + file.base
    return path.join(file.dir, newName)
  }
}

export default Prefix
