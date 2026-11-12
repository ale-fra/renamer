// Local declarations for file-set@5 (ships no types). Compile-time only, not published.
declare module 'file-set' {
  export interface AddOptions {
    /** Sort function applied to the matches of each glob expression. */
    globResultSortFn?: (a: string, b: string) => number
  }
  /** Expands file paths and glob expressions into existing files and directories. */
  export default class FileSet {
    /** The existing files found. */
    files: string[]
    /** The existing directories found. Directory paths always end with `/`. */
    dirs: string[]
    /** Paths and patterns which matched nothing. */
    notExisting: string[]
    /** Add one or more file paths or glob expressions to the set. */
    add (files?: string | string[], options?: AddOptions): Promise<void>
    clear (): void
  }
}
