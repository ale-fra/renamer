// Local declarations for typical@7 (ships no types). Only the functions used by renamer.
declare module 'typical' {
  /** True if `input` is a function whose source begins with `class `. */
  export function isClass (input: unknown): input is new (...args: any[]) => unknown
}
