// Local declarations for load-module@5 (ships no types).
// Every loader resolves to the module's default export, or `null` if the module was not found.
// The default export is arbitrary user code, hence `unknown`.
declare module 'load-module' {
  export interface LoadModuleOptions {
    paths?: string | string[]
    resolvedFromPaths?: string | string[]
    relativeToPaths?: string | string[]
  }
  /** Like `loadModuleResolvedFrom` then `loadModuleRelativeTo`, but throws if not found. */
  export function loadModule (specifier: string, options: LoadModuleOptions): Promise<unknown>
  export function loadModuleSpecifier (specifier: string): Promise<unknown>
  /** Resolve `specifier` as a package/module name from the supplied directories. */
  export function loadModuleResolvedFrom (specifier: string, paths: string | string[]): Promise<unknown>
  /** Resolve `specifier` as a file path relative to each of the supplied directories in turn. */
  export function loadModuleRelativeTo (specifier: string, paths: string | string[]): Promise<unknown>
}
