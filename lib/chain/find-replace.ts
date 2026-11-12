import path from 'node:path'
import type { FindPattern, OptionDefinition, Plugin, Replacement, ReplaceOptions } from '../types.ts'

/* Two branches are needed to satisfy the overloads of `String.prototype.replace`. */
function replaceIn (input: string, find: FindPattern, replace: Replacement): string {
  return typeof replace === 'string'
    ? input.replace(find, replace)
    : input.replace(find, replace)
}

class FindReplace implements Plugin {
  description (): string {
    return 'Find and replace strings and regular expressions.'
  }

  optionDefinitions (): OptionDefinition[] {
    return [
      {
        name: 'find',
        alias: 'f',
        type: String,
        description: 'Optional find string (e.g. `one`) or regular expression literal (e.g. `/one/i`). If omitted, the whole path element (by default, the file name) is replaced.'
      },
      {
        name: 'replace',
        alias: 'r',
        type: String,
        defaultValue: '',
        description: 'The replace string. If omitted, defaults to an empty string.'
      },
      {
        name: 'path-element',
        alias: 'e',
        description: 'The path element to rename, valid values are `base` (the default), `name` and `ext`. For example, in the path `pics/image.jpg`, the base is `image.jpg`, the name is `image` and the ext is `.jpg`.'
      }
    ]
  }

  replace (filePath: string, options: ReplaceOptions = {}): string {
    const { find, replace } = options
    if (find || replace) {
      const file = path.parse(filePath)
      const replacement = replace ?? ''
      const element = options.pathElement || 'base'
      if (element === 'base' || element === 'name' || element === 'ext') {
        /* If `find` is omitted, the whole path element is replaced */
        const findPattern = find || file[element]
        let basename: string
        if (element === 'base') {
          basename = replaceIn(file.base, findPattern, replacement)
        } else {
          file[element] = replaceIn(file[element], findPattern, replacement)
          basename = file.name + file.ext
        }
        if (basename) {
          return path.join(file.dir, basename)
        } else {
          throw new Error(`Replace resulted in empty filename. File: ${filePath}, find: ${findPattern}, replace: ${replacement}`)
        }
      } else {
        /* Unreachable for typed callers; reachable from JavaScript and the CLI. */
        throw new Error('Invalid path element: ' + String(element))
      }
    } else {
      throw new Error('Please specify a value for `find` and/or `replace`')
    }
  }
}

export default FindReplace
