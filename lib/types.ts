/**
 * Public types for renamer: the library API, replace chain plugins and views.
 * This module contains types only and has no runtime output.
 */

/* ---------------------------------------------------------------- options */

/** A literal string or a regular expression to search the path element for. Only the first match is replaced unless a RegExp has the `g` flag. */
export type FindPattern = string | RegExp

/**
 * The replacement, as accepted by `String.prototype.replace`: a string (which may
 * contain `$1`-style substitution patterns) or a replacer function.
 */
// The replacer signature mirrors `String.prototype.replace` in lib.es5.d.ts, which
// uses `any[]` so that functions declaring specific capture-group params are accepted.
export type Replacement = string | ((substring: string, ...args: any[]) => string)

/**
 * The part of the path to rename. For the path `pics/image.jpg`, the `base` is
 * `image.jpg`, the `name` is `image` and the `ext` is `.jpg`.
 */
export type PathElement = 'base' | 'name' | 'ext'

/**
 * Options accepted by `Renamer.rename()` and `Renamer.results()`.
 *
 * Declared as a type alias rather than an interface so that a value annotated as
 * `RenamerOptions` is assignable to {@link ReplaceOptions}, which adds an index
 * signature for plugin-specific options.
 */
export type RenamerOptions = {
  /** One or more file paths, directory paths or glob patterns to process. */
  files?: string | string[]
  /** Do everything except rename the files. */
  dryRun?: boolean
  /** Overwrite the target path if it exists. Use with caution. */
  force?: boolean
  /**
   * The replace chain. Each item is a built-in plugin name (`find-replace` or
   * `index-replace`), a path to a plugin file, the name of a plugin package
   * installed locally or globally, a plugin class or a plugin instance. Defaults
   * to `['find-replace', 'index-replace']`.
   */
  chain?: PluginReference | PluginReference[]
  /** Text or pattern to find. If omitted, the whole path element is replaced. */
  find?: FindPattern | null
  /** The replacement. Defaults to an empty string. */
  replace?: Replacement
  /** The path element to rename. Defaults to `base`. */
  pathElement?: PathElement
  /** A printf format string for the `{{index}}` token, e.g. `%03d`. Defaults to `%d`. */
  indexFormat?: string
  /** The initial value of the `{{index}}` token. Defaults to `1`. */
  indexRoot?: number | string
}

/**
 * The options object passed to a plugin's `replace` method: the renamer options
 * plus any plugin-specific options (e.g. `--case camel` arrives as `options.case`).
 */
export type ReplaceOptions = RenamerOptions & { readonly [option: string]: unknown }

/**
 * The options parsed from the command line, as passed to views and plugins. Includes
 * the options defined by the loaded plugins, e.g. `--case camel` arrives as `case`.
 */
export interface CliOptions extends RenamerOptions {
  files?: string[]
  /**
   * A built-in view name (`long`, `diff`, `one-line`), the path to a custom view
   * module or the name of a locally installed view package.
   */
  view?: string
  /** Suppress all output. */
  silent?: boolean
  /** Also output the files that were not renamed. */
  verbose?: boolean
  /** Print the usage guide instead of renaming. */
  help?: boolean
  /** The loaded replace chain plugins. */
  plugin?: Plugin[]
  /** Options defined by plugins. */
  [option: string]: unknown
}

/* ---------------------------------------------------------------- results */

/** A file that the replace chain renamed. */
export interface RenamedResult {
  /** The path before the rename. */
  from: string
  /** The path after the rename. */
  to: string
  renamed: true
}

/** A file whose path the replace chain left unchanged. */
export interface UnchangedResult {
  /** The original path. */
  from: string
  to: null
  renamed: false
}

/** The outcome of passing one file through the replace chain. Narrow on `renamed`. */
export type ReplaceResult = RenamedResult | UnchangedResult

/** Totals reported when a rename run completes. */
export interface RenameStats {
  /** The number of files and directories processed. */
  total: number
  /** The number renamed (or, in a dry run, that would have been renamed). */
  renamed: number
  /** The number left unchanged. */
  notRenamed: number
}

/** Options for the low-level rename of a single file. */
export interface RenameFileOptions {
  /** Rename even if the target path exists. */
  force?: boolean
  /** Simulate the rename without touching the file system. */
  dryRun?: boolean
  /**
   * Targets claimed by earlier dry-run renames in the same run, mapped to their
   * source path. Share one log between the renames of a run to detect two files
   * being renamed to the same target. Without it, each dry-run rename is checked
   * in isolation.
   */
  dryRunLog?: Map<string, string>
}

/** The error thrown when a rename target already exists and `force` is not set. */
export type TargetExistsError = Error & { code: 'exists' }

/* ---------------------------------------------------------------- plugins */

/**
 * A command-line option definition, as used by command-line-args and
 * command-line-usage. Plugins return these from `optionDefinitions()`.
 */
export interface OptionDefinition {
  /** The long option name, e.g. `index-format`. Arrives in `options` camel-cased. */
  name: string
  /** A setter function such as `String`, `Number` or `Boolean`. */
  type?: (input: string) => unknown
  /** A single-character short alias, e.g. `f`. */
  alias?: string
  /** Accept multiple values, e.g. `--files one two`. */
  multiple?: boolean
  /** Accept multiple values, one per occurrence of the option, e.g. `--chain one --chain two`. */
  lazyMultiple?: boolean
  /** Values without an option name are assigned to this option. */
  defaultOption?: boolean
  /** The value used if the option is not set. */
  defaultValue?: unknown
  /** Groups the option into one or more named groups. */
  group?: string | string[]
  /** Description printed in the usage guide. */
  description?: string
  /** Type label printed in the usage guide. */
  typeLabel?: string
}

/** A replace chain plugin. */
export interface Plugin {
  /**
   * Return the new path for `filePath`, or `filePath` unchanged. Renamer computes
   * the new path of every file before renaming any, so the paths plugins receive
   * are never affected by an earlier rename in the same run.
   * @param filePath - The current file path, as output by the previous plugin in the chain.
   * @param options - The renamer options plus any plugin-specific options.
   * @param index - The position of the file within the full list of input files.
   * @param files - The full list of input files, after glob expansion.
   */
  replace (filePath: string, options: ReplaceOptions, index: number, files: string[]): string
  /** Optional description printed in the "Replace chain" section of `renamer --help`. */
  description? (): string
  /** Optional extra command-line options used by this plugin. */
  optionDefinitions? (): OptionDefinition[]
}

/** A plugin class. Renamer instantiates it with no arguments. */
export type PluginClass = new () => Plugin

/**
 * Anything that may appear in the replace chain: a built-in plugin name, a plugin
 * file path or package name, a plugin class or a plugin instance.
 */
export type PluginReference = string | PluginClass | Plugin

/* ---------------------------------------------------------------- views */

/** Maps each event a view receives to the type of its value. */
export interface ViewEventMap {
  /** Informational message, e.g. `Dry run`. */
  info: string
  /** Processing is about to start. */
  start: null
  /** One file has been processed. */
  result: ReplaceResult
  /** All files have been processed. */
  complete: RenameStats
  /** A fatal error. */
  error: Error
  /** The formatted usage guide (`--help`). */
  usage: string
}

/** The name of a view event. */
export type ViewEvent = keyof ViewEventMap

/**
 * The arguments of `View.write`, one tuple per event. Because this is a union of
 * tuples, switching on `key` inside `write` narrows the type of `value`.
 * `options` is undefined if the command line could not be parsed.
 */
export type ViewWriteArgs = {
  [K in ViewEvent]: [key: K, value: ViewEventMap[K], options?: CliOptions]
}[ViewEvent]

/** Receives output events from the command-line interface. */
export interface View {
  write (...args: ViewWriteArgs): void
}

/** A view class. The CLI instantiates it with no arguments. */
export type ViewClass = new () => View
