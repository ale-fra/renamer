// Local declarations for array-back@6 (ships no types). Compile-time only, not published.
declare module 'array-back' {
  /**
   * Arrays are returned as-is, `undefined` becomes `[]`, Sets and array-likes are
   * converted with `Array.from`, any other value is wrapped: `[input]`.
   */
  export default function arrayify<T> (input: T | readonly T[] | Set<T> | undefined): T[]
}
