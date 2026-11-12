/**
 * The symbols used in renamer's output. Unicode symbols are only used where the
 * terminal can be expected to display them, otherwise ASCII is used: a terminal
 * which is not decoding UTF-8 displays each byte of a Unicode symbol as a separate
 * replacement character, e.g. `✔︎` (6 bytes) as `������`.
 */

export interface OutputSymbols {
  /** Marks a renamed file. */
  tick: string
  /** Marks a file which was not renamed. */
  cross: string
  /** Separates the old and new paths. */
  arrow: string
  /** Marks each plugin in the replace chain listed by `--help`. */
  chainItem: string
}

const unicodeSymbols: OutputSymbols = { tick: '✔︎', cross: '✖', arrow: '→', chainItem: '↓' }
/* Symbols which the default Windows console fonts can display */
const windowsSymbols: OutputSymbols = { tick: '√', cross: '×', arrow: '→', chainItem: '↓' }
const asciiSymbols: OutputSymbols = { tick: '+', cross: '-', arrow: '->', chainItem: '-' }

/**
 * True if the terminal can be expected to display Unicode. On macOS and Linux this
 * depends on the locale: the first of `LC_ALL`, `LC_CTYPE` and `LANG` which is set
 * must specify UTF-8 (the same rule npm uses). If none is set, the locale is `C`
 * (ASCII). The Linux virtual console (`TERM=linux`) lacks the glyphs, so is excluded.
 * To force ASCII output, run renamer with `LC_ALL=C`.
 */
export function isUnicodeSupported (env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): boolean {
  /* An explicit ASCII locale must also work on Windows. */
  if (env.LC_ALL === 'C' || env.LC_ALL === 'POSIX') return false
  if (platform === 'win32') {
    return true
  }
  if (env.TERM === 'linux') {
    return false
  }
  const locale = env.LC_ALL || env.LC_CTYPE || env.LANG || ''
  return /utf-?8/i.test(locale)
}

/** The symbols to use in the output, see `isUnicodeSupported()`. */
export function outputSymbols (env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): OutputSymbols {
  if (!isUnicodeSupported(env, platform)) {
    return asciiSymbols
  } else if (platform === 'win32') {
    return windowsSymbols
  } else {
    return unicodeSymbols
  }
}
