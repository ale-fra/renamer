import { loadPlugins } from './util.ts'
import arrayify from 'array-back'
import path from 'node:path'
import FindReplace from './chain/find-replace.ts'
import IndexReplace from './chain/index-replace.ts'
import type { Plugin, PluginReference, ReplaceOptions, ReplaceResult } from './types.ts'

/** Passes each file path through a chain of plugins to compute its new path. */
class ReplaceChain {
  /** The loaded plugins, in chain order. Empty until `loadPlugins()` is called. */
  plugins: Plugin[] = []

  /** Load the chain. An empty or missing list loads the default chain: find-replace then index-replace. */
  async loadPlugins (pluginNames?: PluginReference | PluginReference[]): Promise<void> {
    const names = arrayify(pluginNames)
    if (names.length) {
      this.plugins = await loadPlugins(names)
    } else {
      this.plugins = [new FindReplace(), new IndexReplace()]
    }
  }

  /**
   * Pass `file` through each plugin in turn, each receiving the previous plugin's output.
   * @param file - The path to process.
   * @param options - The renamer options, passed to each plugin.
   * @param index - The position of `file` within `files`.
   * @param files - The full list of files being processed.
   */
  replace (file: string, options: ReplaceOptions, index: number, files: string[]): ReplaceResult {
    let to = file
    /* replace pipeline */
    for (const plugin of this.plugins) {
      const output: unknown = plugin.replace(to, options, index, files)
      if (typeof output !== 'string') {
        throw new Error(`Invalid plugin: ${plugin.constructor.name}.replace() must return a string`)
      }
      to = output
    }
    return path.resolve(file) !== path.resolve(to)
      ? { from: file, to, renamed: true }
      : { from: file, to: null, renamed: false }
  }
}

export default ReplaceChain
