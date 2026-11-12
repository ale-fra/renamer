// Local declarations for stream-read-all@5 (ships no types).
declare module 'stream-read-all' {
  import type { Readable } from 'node:stream'
  /**
   * Read a stream to completion. Resolves to an array of chunks for object-mode
   * streams, a string if an encoding is set, otherwise a Buffer.
   */
  export function streamReadAll (stream: Readable): Promise<Buffer | string | unknown[]>
  /** Read a stream to completion, returning the content as text. */
  export function streamReadText (stream: Readable, encoding?: BufferEncoding): Promise<string>
}
