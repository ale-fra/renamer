import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isFileAccessible } from './util.ts'
import type { RenameFileOptions, TargetExistsError } from './types.ts'

function targetExistsError (from: string, to: string): TargetExistsError {
  return Object.assign(
    new Error(`Unable to rename ${from} to ${to} [file exists]`),
    { code: 'exists' as const }
  )
}

/**
 * Rename a single file, refusing to overwrite an existing, accessible target
 * unless `options.force` is set. A dry run performs the same checks without
 * renaming; pass a shared `options.dryRunLog` to also detect two files of the
 * same run being renamed to the same target.
 * @param from - The current file path.
 * @param to - The new file path.
 * @param options - Options object.
 * @throws {TargetExistsError} If the target exists (or was claimed earlier in a dry run) and `force` is not set.
 */
async function renameFile (from: string, to: string, options?: RenameFileOptions | null): Promise<void> {
  const { force, dryRun, dryRunLog = new Map<string, string>() } = options ?? {}
  /* Prevent user over-writing an existing, accessible file, unless --force specified */
  if (await isFileAccessible(to) && !force) {
    throw targetExistsError(from, to)
  } else {
    if (dryRun) {
      const target = path.resolve(to)
      if (dryRunLog.has(target) && !force) {
        throw targetExistsError(from, to)
      } else {
        dryRunLog.set(target, from)
      }
    } else {
      await fs.rename(from, to)
    }
  }
}

export default renameFile
