import path from 'node:path'
import { sprintf } from 'printj/printj.mjs'
import type { OptionDefinition, Plugin, ReplaceOptions } from '../types.ts'

class IndexReplace implements Plugin {
  /* The next number to use in place of {{index}}. Unset until the first match. */
  protected matchCount?: number

  description (): string {
    return 'Replace the `\\{\\{index\\}\\}` token in a file name with a number, incremented for each file name containing the token.'
  }

  optionDefinitions (): OptionDefinition[] {
    return [
      { name: 'index-format', description: 'The format of the number to replace `\\{\\{index\\}\\}` with. Specify a standard printf format string, for example `%03d` would yield 001, 002, 003 etc. Defaults to `%d`.' },
      { name: 'index-root', description: 'The initial value for `\\{\\{index\\}\\}`. Defaults to 1.' }
    ]
  }

  /* Number to use in place of {{index}}. `indexRoot` is a string when set on the command line. */
  protected calculateMatchCount (indexRoot?: number | string): number {
    if (this.matchCount || this.matchCount === 0) {
      return this.matchCount
    } else if (indexRoot || indexRoot === 0) {
      return Number(indexRoot)
    } else {
      return 1
    }
  }

  replace (filePath: string, options: ReplaceOptions): string {
    const file = path.parse(filePath)
    /* Only the file name is renamed, so only a token in the file name counts */
    if (/{{index}}/.test(file.base)) {
      this.matchCount = this.calculateMatchCount(options.indexRoot)
      const newBasename = this.replaceIndexToken(file.base, this.matchCount++, options.indexFormat || '%d')
      return path.join(file.dir, newBasename)
    } else {
      return filePath
    }
  }

  protected replaceIndexToken (basename: string, index: number, format: string): string {
    return basename.replace(/{{index}}/g, sprintf(format, index))
  }
}

export default IndexReplace
