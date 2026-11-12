// Local declarations for command-line-args@6 (the @types package targets v5).
declare module 'command-line-args' {
  export interface OptionDefinition {
    name: string
    type?: (input: string) => unknown
    alias?: string
    multiple?: boolean
    lazyMultiple?: boolean
    defaultOption?: boolean
    defaultValue?: unknown
    group?: string | string[]
  }
  export interface ParseOptions {
    /** Defaults to `process.argv`. */
    argv?: string[]
    /** Collect unknown options in `_unknown` instead of throwing. */
    partial?: boolean
    stopAtFirstUnknown?: boolean
    /** Convert hyphenated option names to camel-case. */
    camelCase?: boolean
    caseInsensitive?: boolean
  }
  /**
   * Parse the command line. Keys are the option names (camel-cased if requested),
   * values depend on the definitions, hence `unknown`.
   * @throws An error named `UNKNOWN_OPTION` etc. for invalid input, unless `partial` is set.
   */
  export default function commandLineArgs (
    optionDefinitions: readonly OptionDefinition[],
    options?: ParseOptions
  ): Record<string, unknown>
}
