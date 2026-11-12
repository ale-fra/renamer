import { promises as fs, constants } from 'node:fs'
import path from 'node:path'
import arrayify from 'array-back'
import { isClass } from 'typical'
import { loadModuleResolvedFrom, loadModuleRelativeTo } from 'load-module'
import globalDirs from 'global-directory'
import FindReplace from './chain/find-replace.ts'
import IndexReplace from './chain/index-replace.ts'
import type { FindPattern, Plugin, PluginReference } from './types.ts'

/**
 * Convert a regular expression literal like `/something/g` to a RegExp instance.
 * Only a string that is entirely a literal (slash, pattern, slash, optional flags)
 * is converted; other strings and RegExp instances are returned unchanged. An empty
 * or missing input returns `null`. Throws a SyntaxError for invalid patterns or flags.
 */
export function regExpBuilder (find?: FindPattern | null): FindPattern | null {
  const regExpRe = /^\/(.*)\/(\w*)$/
  if (typeof find === 'string' && find) {
    const matches = regExpRe.exec(find)
    if (matches) {
      const [, pattern = '', flags = ''] = matches
      return new RegExp(pattern, flags)
    } else {
      return find
    }
  } else {
    return find || null
  }
}

/**
 * Built-in plugins may also be referenced by file name, e.g. `find-replace.js`.
 * These names are only matched after the user's own directories have been searched.
 */
const builtInPluginFiles: Record<string, new () => Plugin> = {
  'find-replace.js': FindReplace,
  'find-replace.ts': FindReplace,
  'index-replace.js': IndexReplace,
  'index-replace.ts': IndexReplace
}

function builtInPluginByFile (pluginName: string): (new () => Plugin) | undefined {
  const fileName = pluginName.startsWith('./') ? pluginName.slice(2) : pluginName
  return Object.hasOwn(builtInPluginFiles, fileName) ? builtInPluginFiles[fileName] : undefined
}

/** True if `input` looks like a plugin instance, i.e. it has a `replace` method. */
export function isPlugin (input: unknown): input is Plugin {
  return (typeof input === 'object' || typeof input === 'function') &&
    input !== null &&
    typeof (input as { replace?: unknown }).replace === 'function'
}

/**
 * Load the replace chain. Each item may be a built-in plugin name, a path to a
 * plugin file, the name of an installed plugin package, a plugin class or a plugin
 * instance. Items are validated at runtime as they may come from JavaScript callers.
 */
export async function loadPlugins (pluginNames?: PluginReference | PluginReference[]): Promise<Plugin[]> {
  const plugins: unknown[] = []
  for (const pluginName of arrayify<unknown>(pluginNames)) {
    if (pluginName === 'find-replace') {
      plugins.push(new FindReplace())
    } else if (pluginName === 'index-replace') {
      plugins.push(new IndexReplace())
    } else if (typeof pluginName === 'string') {
      /* look for user-installed plugin both locally and globally */
      let PluginClass = await loadModuleResolvedFrom(pluginName, [
        process.cwd(),
        globalDirs.npm.packages,
        globalDirs.yarn.packages
      ])
      if (PluginClass === null) {
        PluginClass = await loadModuleRelativeTo(pluginName, [process.cwd()])
      }
      if (PluginClass === null) {
        PluginClass = builtInPluginByFile(pluginName) ?? null
      }
      if (PluginClass === null) {
        throw new Error('plugin could not be found: ' + pluginName)
      } else if (!isClass(PluginClass)) {
        throw new Error('Invalid plugin: plugin module must export a class')
      } else {
        plugins.push(new PluginClass())
      }
    } else if (isClass(pluginName)) {
      plugins.push(new pluginName())
    } else {
      plugins.push(pluginName)
    }
  }
  if (!plugins.every(isPlugin)) {
    throw new Error('Invalid plugin: plugin class must implement a replace method')
  }
  return plugins
}

/** True if `file` exists and is readable and writable. */
export async function isFileAccessible (file: string): Promise<boolean> {
  try {
    await fs.access(file, constants.R_OK | constants.W_OK)
    return true
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    } else {
      throw err
    }
  }
}

const naturalCollator = new Intl.Collator('en', { numeric: true })

/**
 * Array sort comparator giving natural order, e.g. `file2` before `file10`. Uses a
 * fixed locale so the order is the same on every machine.
 */
export function naturalCompare (a: string, b: string): number {
  return naturalCollator.compare(a, b)
}

/** Array sort comparator: deeper paths sort first so children are renamed before their parents. */
export function depthFirstCompare (a: string, b: string): number {
  a = path.normalize(a)
  b = path.normalize(b)
  const depth = {
    a: a.split(path.sep).length,
    b: b.split(path.sep).length
  }
  if (depth.a > depth.b) {
    return -1
  } if (depth.a === depth.b) {
    return 0
  } else {
    return 1
  }
}
