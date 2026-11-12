import type { Plugin } from '../../index.ts'

/* Counts its instances, to check how many times the CLI loads the chain. */
class CountingPlugin implements Plugin {
  static instances = 0

  constructor () {
    CountingPlugin.instances++
  }

  replace (filePath: string): string {
    return filePath
  }
}

export default CountingPlugin
