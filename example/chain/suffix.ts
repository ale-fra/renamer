import path from 'node:path'
import type { OptionDefinition, Plugin, ReplaceOptions } from 'renamer'

class Suffix implements Plugin {
  /**
   * An optional description which will be printed in the "replace chain" section of `renamer --help`.
   */
  description (): string {
    return 'Adds a suffix to the file name.'
  }

  /**
   * Zero or more custom option definitions.
   * @see https://github.com/75lb/command-line-args/blob/master/doc/option-definition.md
   */
  optionDefinitions (): OptionDefinition[] {
    return [
      {
        name: 'suffix',
        type: String,
        description: 'The suffix to append to each file.',
        defaultValue: ''
      }
    ]
  }

  /**
   * This method is mandatory and should modify the incoming file path as required, returning the new path.
   * @param filePath - The current file path being processed
   * @param options - The current renamer options (in camel-case), e.g. `options.find`, `options.replace` plus any custom options.
   * @returns The modified or unmodified file path.
   */
  replace (filePath: string, options: ReplaceOptions): string {
    const file = path.parse(filePath)
    /* `defaultValue` only applies on the command line: via the API, unset options are undefined */
    const suffix = typeof options.suffix === 'string' ? options.suffix : ''
    const newName = file.name + suffix + file.ext
    return path.join(file.dir, newName)
  }
}

export default Suffix
