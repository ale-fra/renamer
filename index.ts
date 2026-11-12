import renameFile from './lib/rename-file.ts'
import ReplaceChain from './lib/replace-chain.ts'
import FileSet from 'file-set'
import { depthFirstCompare, naturalCompare } from './lib/util.ts'
import type { ReplaceOptions, ReplaceResult } from './lib/types.ts'

export type * from './lib/types.ts'

/* The built-in plugins and views, for use in a chain or as base classes */
export { default as FindReplace } from './lib/chain/find-replace.ts'
export { default as IndexReplace } from './lib/chain/index-replace.ts'
export { default as DefaultView } from './lib/view/default.ts'
export { default as LongView } from './lib/view/long.ts'
export { default as DiffView } from './lib/view/diff.ts'
export { default as OneLineView } from './lib/view/one-line.ts'

/**
 * A tool to rename files and folders in bulk.
 *
 * The `options` accepted by `rename()` and `results()` are the {@link RenamerOptions}
 * plus any options defined by the plugins in the replace chain, e.g. `case` for
 * renamer-case.
 */
class Renamer {
  /**
   * Rename files in bulk, resolving once every file has been processed.
   * @param options - The renamer options plus any plugin-specific options.
   * @returns One result per file processed.
   */
  async rename (options: ReplaceOptions = {}): Promise<ReplaceResult[]> {
    const results: ReplaceResult[] = []
    for await (const result of this.results(options)) {
      results.push(result)
    }
    return results
  }

  /**
   * Rename files one at a time, yielding each result as the rename completes.
   * Files are processed before directories, deepest first. Glob matches are
   * processed in natural order (`file2` before `file10`), explicit paths in the
   * order given.
   * @param options - The renamer options plus any plugin-specific options.
   * @throws If any path or pattern in `options.files` matches nothing, a plugin
   * cannot be loaded, or a rename fails.
   */
  async * results (options: ReplaceOptions = {}): AsyncGenerator<ReplaceResult, void, undefined> {
    const fileSet = new FileSet()
    /* Glob matches are returned in file-system order, which varies: sort them so that
       the processing order, and so {{index}} numbering, is predictable. Explicit paths
       keep the order given. */
    await fileSet.add(options.files, { globResultSortFn: naturalCompare })
    if (fileSet.notExisting.length) {
      throw new Error(`These paths or patterns do not exist: ${fileSet.notExisting.join(', ')}`)
    }
    const replaceChain = new ReplaceChain()
    await replaceChain.loadPlugins(options.chain)
    const files = [...fileSet.files, ...fileSet.dirs.sort(depthFirstCompare)]
    /* Compute every new path before renaming anything */
    const replaceResults = files
      .map((file, index) => replaceChain.replace(file, options, index, files))
    /* Scoped to this run so that separate dry runs do not collide */
    const dryRunLog = new Map<string, string>()
    for (const replaceResult of replaceResults) {
      if (replaceResult.renamed) {
        await renameFile(replaceResult.from, replaceResult.to, { force: options.force, dryRun: options.dryRun, dryRunLog })
      }
      yield replaceResult
    }
  }
}

export default Renamer
