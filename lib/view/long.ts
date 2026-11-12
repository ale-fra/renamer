import DefaultView from './default.ts'
import type { CliOptions, ReplaceResult } from '../types.ts'

/** Before and after paths on separate lines. */
class LongView extends DefaultView {
  override logResult (result: ReplaceResult, options: CliOptions = {}): void {
    const symbol = this.resultSymbol(result)

    if (options.verbose) {
      this.log(`${'Renamed:'.padEnd(8)} ${symbol}`)
      this.log(`${'Before:'.padEnd(8)} ${result.from}`)
      if (result.renamed) {
        this.log(`${'After:'.padEnd(8)} ${result.to}`)
      }
      this.log('--------')
    } else {
      if (result.renamed) {
        this.log(`${'Before:'.padEnd(8)} ${result.from}`)
        this.log(`${'After:'.padEnd(8)} ${result.to}`)
        this.log('--------')
      }
    }
  }
}

export default LongView
